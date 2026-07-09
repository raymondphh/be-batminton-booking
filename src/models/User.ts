import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '@/config/env';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager', // quan ly
  CUSTOMER = 'customer' // khach hang
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  tokenVersion: number; // tang len de "logout tat ca thiet bi" / thu hoi toan bo access token cu
  loginAttempts: number;
  lockUntil?: Date | null;
  createdBy?: Types.ObjectId | null; // admin nao da tao tai khoan quan ly nay
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, 'Ho ten la bat buoc'],
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    email: {
      type: String,
      required: [true, 'Email la bat buoc'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email khong hop le']
    },
    password: {
      type: String,
      required: [true, 'Mat khau la bat buoc'],
      minlength: 8,
      select: false // khong tra password ve trong query mac dinh
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
      required: true
    },
    phone: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

// Bam mat khau truoc khi luu, chi khi mat khau thay doi
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(env.bcryptSaltRounds);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function (): boolean {
  return !!this.lockUntil && this.lockUntil.getTime() > Date.now();
};

// Khong bao gio expose password/__v ra ngoai khi toJSON
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.password;
    delete obj.__v;
    delete obj.loginAttempts;
    delete obj.lockUntil;
    delete obj.tokenVersion;
    return obj;
  }
});

export const User = model<IUser>('User', userSchema);
