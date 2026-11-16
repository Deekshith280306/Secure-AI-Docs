import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'Officer' | 'Verifier' | 'Admin' | 'Auditor';

export interface IUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  totpSecret?: string;
  isVerified: boolean;
  twoFactorEnabled?: boolean;
  createdAt: Date;
}

export interface IUserDocument extends Omit<IUser, 'id'>, Document {}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['Officer', 'Verifier', 'Admin', 'Auditor'],
      default: 'Officer',
      required: true,
    },
    totpSecret: { type: String },
    isVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

// In-Memory Repository Fallback (for instant zero-config standalone development)
class InMemoryUserStore {
  private users: Map<string, IUser> = new Map();

  async findByEmail(email: string): Promise<IUser | null> {
    const clean = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email === clean) return { ...user };
    }
    return null;
  }

  async findById(id: string): Promise<IUser | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async create(userData: Omit<IUser, 'id' | 'createdAt'>): Promise<IUser> {
    const id = new mongoose.Types.ObjectId().toString();
    const newUser: IUser = {
      ...userData,
      email: userData.email.toLowerCase().trim(),
      id,
      createdAt: new Date(),
    };
    this.users.set(id, newUser);
    return { ...newUser };
  }

  async update(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.users.set(id, updated);
    return { ...updated };
  }

  async count(): Promise<number> {
    return this.users.size;
  }
}

const inMemoryStore = new InMemoryUserStore();

export const UserRepository = {
  async findByEmail(email: string): Promise<IUser | null> {
    if (mongoose.connection.readyState === 1) {
      const doc = await UserModel.findOne({ email: email.toLowerCase().trim() });
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        passwordHash: doc.passwordHash,
        role: doc.role as UserRole,
        totpSecret: doc.totpSecret,
        isVerified: doc.isVerified,
        twoFactorEnabled: !!doc.twoFactorEnabled,
        createdAt: (doc as any).createdAt,
      };
    }
    return inMemoryStore.findByEmail(email);
  },

  async findById(id: string): Promise<IUser | null> {
    if (mongoose.connection.readyState === 1) {
      const doc = await UserModel.findById(id);
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        passwordHash: doc.passwordHash,
        role: doc.role as UserRole,
        totpSecret: doc.totpSecret,
        isVerified: doc.isVerified,
        twoFactorEnabled: !!doc.twoFactorEnabled,
        createdAt: (doc as any).createdAt,
      };
    }
    return inMemoryStore.findById(id);
  },

  async create(data: Omit<IUser, 'id' | 'createdAt'>): Promise<IUser> {
    if (mongoose.connection.readyState === 1) {
      const doc = await UserModel.create(data);
      return {
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        passwordHash: doc.passwordHash,
        role: doc.role as UserRole,
        totpSecret: doc.totpSecret,
        isVerified: doc.isVerified,
        twoFactorEnabled: !!doc.twoFactorEnabled,
        createdAt: (doc as any).createdAt,
      };
    }
    return inMemoryStore.create(data);
  },

  async update(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    if (mongoose.connection.readyState === 1) {
      const doc = await UserModel.findByIdAndUpdate(id, updates, { new: true });
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        passwordHash: doc.passwordHash,
        role: doc.role as UserRole,
        totpSecret: doc.totpSecret,
        isVerified: doc.isVerified,
        twoFactorEnabled: !!doc.twoFactorEnabled,
        createdAt: (doc as any).createdAt,
      };
    }
    return inMemoryStore.update(id, updates);
  },
};
