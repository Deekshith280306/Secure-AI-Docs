import mongoose, { Schema, Document } from 'mongoose';

export type AuditAction =
  | 'GENESIS'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_VERIFIED'
  | 'DOCUMENT_FLAGGED'
  | 'DOCUMENT_DOWNLOADED'
  | 'USER_LOGIN'
  | 'USER_LOGIN_2FA'
  | 'CERTIFICATE_EXPORTED'
  | 'AI_METADATA_EXTRACTED'
  | 'AI_PII_REDACTED'
  | 'DOCUMENT_DELETED';

export interface IAuditLog {
  id: string;
  sequenceNumber: number;
  timestamp: Date;
  action: AuditAction;
  userId: string;
  userName: string;
  userRole: string;
  resourceId?: string;
  caseNumber?: string;
  payloadHash: string;
  details?: Record<string, any>;
  previousHash: string;
  currentHash: string;
}

export interface IAuditLogMongoose extends Omit<IAuditLog, 'id'>, Document {}

const AuditLogSchema = new Schema<IAuditLogMongoose>(
  {
    sequenceNumber: { type: Number, required: true, unique: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now },
    action: {
      type: String,
      required: true,
      enum: [
        'GENESIS',
        'DOCUMENT_UPLOADED',
        'DOCUMENT_VERIFIED',
        'DOCUMENT_FLAGGED',
        'DOCUMENT_DOWNLOADED',
        'USER_LOGIN',
        'USER_LOGIN_2FA',
        'CERTIFICATE_EXPORTED',
        'AI_METADATA_EXTRACTED',
        'AI_PII_REDACTED',
        'DOCUMENT_DELETED',
      ],
      index: true,
    },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    resourceId: { type: String, index: true },
    caseNumber: { type: String, index: true },
    payloadHash: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    previousHash: { type: String, required: true },
    currentHash: { type: String, required: true, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

let AuditLogModel: mongoose.Model<IAuditLogMongoose> | null = null;
try {
  AuditLogModel = mongoose.model<IAuditLogMongoose>('AuditLog', AuditLogSchema);
} catch {
  AuditLogModel = mongoose.models.AuditLog || null;
}

// In-Memory Repository Fallback (for zero-setup standalone dev)
class MemoryAuditLogRepository {
  private logs: IAuditLog[] = [];

  async getLatest(): Promise<IAuditLog | null> {
    if (this.logs.length === 0) return null;
    return this.logs[this.logs.length - 1];
  }

  async findBySequence(sequence: number): Promise<IAuditLog | null> {
    return this.logs.find((l) => l.sequenceNumber === sequence) || null;
  }

  async create(data: Omit<IAuditLog, 'id'>): Promise<IAuditLog> {
    const id = new mongoose.Types.ObjectId().toHexString();
    const newEntry: IAuditLog = {
      id,
      ...data,
      timestamp: data.timestamp instanceof Date ? data.timestamp : new Date(),
    };
    this.logs.push(newEntry);
    return newEntry;
  }

  async findAll(limit = 100): Promise<IAuditLog[]> {
    return [...this.logs].sort((a, b) => b.sequenceNumber - a.sequenceNumber).slice(0, limit);
  }

  async findByCaseNumber(caseNumber: string): Promise<IAuditLog[]> {
    return this.logs
      .filter((l) => l.caseNumber === caseNumber)
      .sort((a, b) => b.sequenceNumber - a.sequenceNumber);
  }

  async count(): Promise<number> {
    return this.logs.length;
  }

  // Used for security test / demo: intentionally corrupt an entry to show tamper detection
  async corruptBlockForTesting(sequence: number, fakePayloadHash: string): Promise<boolean> {
    const block = this.logs.find((l) => l.sequenceNumber === sequence);
    if (!block) return false;
    block.payloadHash = fakePayloadHash;
    return true;
  }

  // Restore/heal after testing
  async restoreBlockForTesting(sequence: number, originalPayloadHash: string): Promise<boolean> {
    const block = this.logs.find((l) => l.sequenceNumber === sequence);
    if (!block) return false;
    block.payloadHash = originalPayloadHash;
    return true;
  }

  async reset(): Promise<void> {
    this.logs = [];
  }
}

const memoryRepo = new MemoryAuditLogRepository();

export const AuditLogRepository = {
  async getLatest(): Promise<IAuditLog | null> {
    if (mongoose.connection.readyState === 1 && AuditLogModel) {
      const doc = await AuditLogModel.findOne().sort({ sequenceNumber: -1 }).lean();
      if (!doc) return null;
      return {
        id: (doc as any)._id.toString(),
        sequenceNumber: doc.sequenceNumber,
        timestamp: doc.timestamp,
        action: doc.action,
        userId: doc.userId,
        userName: doc.userName,
        userRole: doc.userRole,
        resourceId: doc.resourceId,
        caseNumber: doc.caseNumber,
        payloadHash: doc.payloadHash,
        details: doc.details,
        previousHash: doc.previousHash,
        currentHash: doc.currentHash,
      };
    }
    return memoryRepo.getLatest();
  },

  async findBySequence(sequence: number): Promise<IAuditLog | null> {
    if (mongoose.connection.readyState === 1 && AuditLogModel) {
      const doc = await AuditLogModel.findOne({ sequenceNumber: sequence }).lean();
      if (!doc) return null;
      return {
        id: (doc as any)._id.toString(),
        sequenceNumber: doc.sequenceNumber,
        timestamp: doc.timestamp,
        action: doc.action,
        userId: doc.userId,
        userName: doc.userName,
        userRole: doc.userRole,
        resourceId: doc.resourceId,
        caseNumber: doc.caseNumber,
        payloadHash: doc.payloadHash,
        details: doc.details,
        previousHash: doc.previousHash,
        currentHash: doc.currentHash,
      };
    }
    return memoryRepo.findBySequence(sequence);
  },

  async create(data: Omit<IAuditLog, 'id'>): Promise<IAuditLog> {
    if (mongoose.connection.readyState === 1 && AuditLogModel) {
      const created = await AuditLogModel.create(data);
      return {
        id: (created as any)._id.toString(),
        sequenceNumber: created.sequenceNumber,
        timestamp: created.timestamp,
        action: created.action,
        userId: created.userId,
        userName: created.userName,
        userRole: created.userRole,
        resourceId: created.resourceId,
        caseNumber: created.caseNumber,
        payloadHash: created.payloadHash,
        details: created.details,
        previousHash: created.previousHash,
        currentHash: created.currentHash,
      };
    }
    return memoryRepo.create(data);
  },

  async findAll(limit = 100): Promise<IAuditLog[]> {
    if (mongoose.connection.readyState === 1 && AuditLogModel) {
      const docs = await AuditLogModel.find()
        .sort({ sequenceNumber: -1 })
        .limit(limit)
        .lean();
      return docs.map((doc: any) => ({
        id: doc._id.toString(),
        sequenceNumber: doc.sequenceNumber,
        timestamp: doc.timestamp,
        action: doc.action,
        userId: doc.userId,
        userName: doc.userName,
        userRole: doc.userRole,
        resourceId: doc.resourceId,
        caseNumber: doc.caseNumber,
        payloadHash: doc.payloadHash,
        details: doc.details,
        previousHash: doc.previousHash,
        currentHash: doc.currentHash,
      }));
    }
    return memoryRepo.findAll(limit);
  },

  async findByCaseNumber(caseNumber: string): Promise<IAuditLog[]> {
    if (mongoose.connection.readyState === 1 && AuditLogModel) {
      const docs = await AuditLogModel.find({ caseNumber })
        .sort({ sequenceNumber: -1 })
        .lean();
      return docs.map((doc: any) => ({
        id: doc._id.toString(),
        sequenceNumber: doc.sequenceNumber,
        timestamp: doc.timestamp,
        action: doc.action,
        userId: doc.userId,
        userName: doc.userName,
        userRole: doc.userRole,
        resourceId: doc.resourceId,
        caseNumber: doc.caseNumber,
        payloadHash: doc.payloadHash,
        details: doc.details,
        previousHash: doc.previousHash,
        currentHash: doc.currentHash,
      }));
    }
    return memoryRepo.findByCaseNumber(caseNumber);
  },

  async count(): Promise<number> {
    if (mongoose.connection.readyState === 1 && AuditLogModel) {
      return AuditLogModel.countDocuments();
    }
    return memoryRepo.count();
  },

  async corruptBlockForTesting(sequence: number, fakePayloadHash: string): Promise<boolean> {
    if (mongoose.connection.readyState === 1 && AuditLogModel) {
      const res = await AuditLogModel.updateOne({ sequenceNumber: sequence }, { payloadHash: fakePayloadHash });
      return res.modifiedCount > 0;
    }
    return memoryRepo.corruptBlockForTesting(sequence, fakePayloadHash);
  },

  async restoreBlockForTesting(sequence: number, originalPayloadHash: string): Promise<boolean> {
    if (mongoose.connection.readyState === 1 && AuditLogModel) {
      const res = await AuditLogModel.updateOne({ sequenceNumber: sequence }, { payloadHash: originalPayloadHash });
      return res.modifiedCount > 0;
    }
    return memoryRepo.restoreBlockForTesting(sequence, originalPayloadHash);
  },

  async reset(): Promise<void> {
    if (mongoose.connection.readyState === 1 && AuditLogModel) {
      await AuditLogModel.deleteMany({});
    }
    await memoryRepo.reset();
  },
};
