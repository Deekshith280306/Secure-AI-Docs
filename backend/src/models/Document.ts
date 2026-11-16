import mongoose, { Schema, Document } from 'mongoose';

export type DocumentCategory =
  | 'First Information Report (FIR)'
  | 'Forensic Lab Report'
  | 'Charge Sheet (Section 173 CrPC)'
  | 'Seizure Memo / Panchnama'
  | 'Court Order'
  | 'CCTV Video / Audio Recording'
  | 'Other Legal Evidence';

export type DocumentStatus = 'DRAFT' | 'UPLOADED' | 'VERIFIED' | 'FLAGGED';

export interface LegalExtractedData {
  documentType: string;
  firNumber?: string;
  policeStation?: string;
  dateOfIncident?: string;
  actsAndSections: string[];
  accusedPersons: string[];
  complainantVictim?: string;
  incidentSummary: string;
  seizedItems?: string[];
  confidenceScore: number;
}

export interface PiiRedactionRecord {
  type: 'AADHAAR' | 'PHONE' | 'PAN' | 'EMAIL' | 'OTHER';
  originalSnippet: string;
  maskedSnippet: string;
  count: number;
}

export interface IDocument {
  id: string;
  caseNumber: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string; // SHA-256 Checksum
  storageKey: string;
  storageProvider: 's3' | 'local_vault';
  status: DocumentStatus;
  uploadedBy: string; // User ID
  uploaderName: string;
  uploaderRole: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  metadata?: Record<string, any>;
  // Phase 5 AI & OCR Fields
  ocrText?: string;
  extractedData?: LegalExtractedData;
  redactedText?: string;
  piiRedactions?: PiiRedactionRecord[];
  aiProcessedAt?: Date;
  aiModelUsed?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocumentMongoose extends Omit<IDocument, 'id'>, Document {}

const DocumentSchema = new Schema<IDocumentMongoose>(
  {
    caseNumber: { type: String, required: true, index: true, trim: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      default: 'First Information Report (FIR)',
    },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    fileHash: { type: String, required: true, index: true },
    storageKey: { type: String, required: true, unique: true },
    storageProvider: {
      type: String,
      enum: ['s3', 'local_vault'],
      default: 'local_vault',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'UPLOADED', 'VERIFIED', 'FLAGGED'],
      default: 'DRAFT',
      index: true,
    },
    uploadedBy: { type: String, required: true },
    uploaderName: { type: String, required: true },
    uploaderRole: { type: String, required: true },
    verifiedBy: { type: String },
    verifiedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
    ocrText: { type: String },
    extractedData: { type: Schema.Types.Mixed },
    redactedText: { type: String },
    piiRedactions: { type: [Schema.Types.Mixed] },
    aiProcessedAt: { type: Date },
    aiModelUsed: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const DocumentModel =
  mongoose.models.LegalDocument ||
  mongoose.model<IDocumentMongoose>('LegalDocument', DocumentSchema);

// In-Memory Repository Fallback (for instant standalone development)
class InMemoryDocumentStore {
  private docs: Map<string, IDocument> = new Map();

  constructor() {
    // Pre-seed genuine court-admissible evidence records
    const seedDocs: IDocument[] = [
      {
        id: 'doc_cbi_rc0772026e0010',
        caseNumber: 'DL-CR-2026-8812',
        title: 'CBI First Information Report (19 Pages)',
        category: 'First Information Report (FIR)',
        fileName: '1960849698RC0772026E0010.pdf',
        fileSize: 7075734,
        mimeType: 'application/pdf',
        fileHash: 'd1c342c96a0a40233c63fb67fd60184237b62e1803d4ad1511a37d0aca67bc17',
        storageKey: 'cases/DL-CR-2026-8812/1793943277564-1960849698RC0772026E0010.pdf',
        storageProvider: 'local_vault',
        status: 'VERIFIED',
        uploadedBy: '6aed56cf0abca62866f4e170',
        uploaderName: 'Inspector Vikramaditya Singh',
        uploaderRole: 'Officer',
        verifiedBy: '6aed56d10abca62866f4e175',
        verifiedAt: new Date(),
        ocrText: `FIRST INFORMATION REPORT (Under Section 173 BNSS / Sec 154 CrPC)
1. District: Cyber & Economic Offences | Police Station: CBI / Economic Offences Branch, New Delhi | Year: 2026
2. FIR / Case No: RC No. RC0772026E0010 | Date & Time: 06/11/2026 11:30 IST
3. Acts & Sections: BNS 2023 Sec 318(4) [Cheating], IT Act Sec 66D [Cheating by Impersonation], BNS 2023 Sec 336(3) [Forgery of Electronic Record]
4. Complainant: Public Sector Banking Cyber Security Cell / R. Sharma | Aadhaar: 5498 7612 3490 | Mobile: +91 98450 12345
5. Accused: Cyber Actor alias "Phantom_Operator" (IP: 182.74.12.89), Beneficiary Syndicate Account #98440210005432
6. Incident Details: Unauthorised intrusion detected in banking core gateway. Digital hash of evidence matched bit-for-bit.
7. Seized Material: Digital Banking Gateway CBS Audit Dump (pcap / auth.log); Signed Section 63 BSA Hash Manifest
(Investigating Officer: Inspector Vikramaditya Singh, Cyber Crime Division)`,
        extractedData: {
          documentType: 'First Information Report (FIR)',
          firNumber: 'RC No. RC0772026E0010',
          policeStation: 'CBI / Economic Offences Branch, New Delhi',
          dateOfIncident: '2026-11-06',
          actsAndSections: [
            'BNS 2023 Sec 318(4) [Cheating]',
            'IT Act Sec 66D [Cheating by Impersonation]',
            'BNS 2023 Sec 336(3) [Forgery of Electronic Record]',
          ],
          accusedPersons: [
            'Cyber Actor alias "Phantom_Operator" (IP: 182.74.12.89)',
            'Beneficiary Syndicate Account #98440210005432',
          ],
          complainantVictim: 'Public Sector Banking Cyber Security Cell / R. Sharma',
          incidentSummary:
            'Formal CBI investigative document RC0772026E0010 filed under BNS 2023 Sec 318(4) [Cheating]. Evidence securely ingested with cryptographic chain verification under BSA 2023 Sec 63.',
          seizedItems: [
            'Digital Banking Gateway CBS Audit Dump (pcap / auth.log)',
            'Signed Section 63 BSA Hash Manifest',
          ],
          confidenceScore: 0.98,
        },
        redactedText: `FIRST INFORMATION REPORT (Under Section 173 BNSS / Sec 154 CrPC)
1. District: Cyber & Economic Offences | Police Station: CBI / Economic Offences Branch, New Delhi | Year: 2026
2. FIR / Case No: RC No. RC0772026E0010 | Date & Time: 06/11/2026 11:30 IST
3. Acts & Sections: BNS 2023 Sec 318(4) [Cheating], IT Act Sec 66D [Cheating by Impersonation], BNS 2023 Sec 336(3) [Forgery of Electronic Record]
4. Complainant: Public Sector Banking Cyber Security Cell / R. Sharma | Aadhaar: XXXX-XXXX-3490 | Mobile: +91-XXXXX-12345
5. Accused: Cyber Actor alias "Phantom_Operator" (IP: 182.74.12.89), Beneficiary Syndicate Account #98440210005432
6. Incident Details: Unauthorised intrusion detected in banking core gateway. Digital hash of evidence matched bit-for-bit.
7. Seized Material: Digital Banking Gateway CBS Audit Dump (pcap / auth.log); Signed Section 63 BSA Hash Manifest
(Investigating Officer: Inspector Vikramaditya Singh, Cyber Crime Division)`,
        piiRedactions: [
          {
            type: 'AADHAAR',
            originalSnippet: 'Aadhaar Identification (12-digit UIDAI)',
            maskedSnippet: 'XXXX-XXXX-####',
            count: 1,
          },
          {
            type: 'PHONE',
            originalSnippet: 'Mobile Contact Number',
            maskedSnippet: '+91-XXXXX-#####',
            count: 1,
          },
        ],
        aiProcessedAt: new Date(),
        aiModelUsed: 'Gemini Legal Vision OCR & BNS Classifier',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'doc_fir_copy_0142_2026',
        caseNumber: 'DL-CR-2026-8812',
        title: 'Official Delhi Police FIR Copy 0142/2026',
        category: 'First Information Report (FIR)',
        fileName: 'Official_FIR_Copy_0142_2026.png',
        fileSize: 2268802,
        mimeType: 'image/png',
        fileHash: '7924cace4043fd5d5e3dd90c3c2a561a97166768c61092089d3ff30034d7eaf4',
        storageKey: 'cases/DL-CR-2026-8812/Official_FIR_Copy_0142_2026.png',
        storageProvider: 'local_vault',
        status: 'VERIFIED',
        uploadedBy: '6aed56cf0abca62866f4e170',
        uploaderName: 'Inspector R. Sharma',
        uploaderRole: 'Officer',
        verifiedBy: '6aed56d10abca62866f4e175',
        verifiedAt: new Date(),
        extractedData: {
          documentType: 'First Information Report (FIR)',
          firNumber: '0142/2026',
          policeStation: 'Cyber Crime PS, Mandir Marg, New Delhi',
          dateOfIncident: '2026-09-24',
          actsAndSections: [
            'BNS 2023 Sec 318(4) (Cheating)',
            'BNS 2023 Sec 316(2) (Criminal Breach of Trust)',
            'IT Act 2000 Section 66D',
          ],
          accusedPersons: ['Rajesh Kumar', 'Unknown Associates'],
          complainantVictim: 'Vikramaditya Oberoi',
          incidentSummary:
            'Fraudulent diversion of ₹48.50 Lakhs via spoofed payment gateway credentials.',
          confidenceScore: 0.99,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const d of seedDocs) {
      this.docs.set(d.id, d);
    }
  }

  async find(): Promise<IDocument[]> {
    return Array.from(this.docs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async findById(id: string): Promise<IDocument | null> {
    const doc = this.docs.get(id);
    return doc ? { ...doc } : null;
  }

  async findByStorageKey(storageKey: string): Promise<IDocument | null> {
    for (const doc of this.docs.values()) {
      if (doc.storageKey === storageKey) return { ...doc };
    }
    return null;
  }

  async findByCaseNumber(caseNumber: string): Promise<IDocument[]> {
    const results: IDocument[] = [];
    const search = caseNumber.toLowerCase().trim();
    for (const doc of this.docs.values()) {
      if (doc.caseNumber.toLowerCase().includes(search)) {
        results.push({ ...doc });
      }
    }
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async create(data: Omit<IDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<IDocument> {
    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date();
    const newDoc: IDocument = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.docs.set(id, newDoc);
    return { ...newDoc };
  }

  async update(id: string, updates: Partial<IDocument>): Promise<IDocument | null> {
    const existing = this.docs.get(id);
    if (!existing) return null;
    const updated: IDocument = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.docs.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.docs.delete(id);
  }
}

const inMemoryDocStore = new InMemoryDocumentStore();

function mapMongoDoc(d: any): IDocument {
  return {
    id: d._id ? d._id.toString() : d.id,
    caseNumber: d.caseNumber,
    title: d.title,
    category: d.category as DocumentCategory,
    fileName: d.fileName,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    fileHash: d.fileHash,
    storageKey: d.storageKey,
    storageProvider: d.storageProvider as any,
    status: d.status as DocumentStatus,
    uploadedBy: d.uploadedBy,
    uploaderName: d.uploaderName,
    uploaderRole: d.uploaderRole,
    verifiedBy: d.verifiedBy,
    verifiedAt: d.verifiedAt,
    metadata: d.metadata,
    ocrText: d.ocrText,
    extractedData: d.extractedData,
    redactedText: d.redactedText,
    piiRedactions: d.piiRedactions,
    aiProcessedAt: d.aiProcessedAt,
    aiModelUsed: d.aiModelUsed,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export const DocumentRepository = {
  async findAll(): Promise<IDocument[]> {
    if (mongoose.connection.readyState === 1) {
      const docs = await DocumentModel.find().sort({ createdAt: -1 });
      return docs.map(mapMongoDoc);
    }
    return inMemoryDocStore.find();
  },

  async findById(id: string): Promise<IDocument | null> {
    if (mongoose.connection.readyState === 1) {
      const d = await DocumentModel.findById(id);
      if (!d) return null;
      return mapMongoDoc(d);
    }
    return inMemoryDocStore.findById(id);
  },

  async findByStorageKey(storageKey: string): Promise<IDocument | null> {
    if (mongoose.connection.readyState === 1) {
      const d = await DocumentModel.findOne({ storageKey });
      if (!d) return null;
      return mapMongoDoc(d);
    }
    return inMemoryDocStore.findByStorageKey(storageKey);
  },

  async findByCaseNumber(caseNumber: string): Promise<IDocument[]> {
    if (mongoose.connection.readyState === 1) {
      const docs = await DocumentModel.find({
        caseNumber: { $regex: caseNumber, $options: 'i' },
      }).sort({ createdAt: -1 });
      return docs.map(mapMongoDoc);
    }
    return inMemoryDocStore.findByCaseNumber(caseNumber);
  },

  async create(data: Omit<IDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<IDocument> {
    if (mongoose.connection.readyState === 1) {
      const d = await DocumentModel.create(data);
      return mapMongoDoc(d);
    }
    return inMemoryDocStore.create(data);
  },

  async update(id: string, updates: Partial<IDocument>): Promise<IDocument | null> {
    if (mongoose.connection.readyState === 1) {
      const d = await DocumentModel.findByIdAndUpdate(id, updates, { new: true });
      if (!d) return null;
      return mapMongoDoc(d);
    }
    return inMemoryDocStore.update(id, updates);
  },

  async delete(id: string): Promise<boolean> {
    if (mongoose.connection.readyState === 1) {
      const res = await DocumentModel.findByIdAndDelete(id);
      return Boolean(res);
    }
    return inMemoryDocStore.delete(id);
  },
};
