import { Schema, model, Document, Types } from 'mongoose';
import crypto from 'crypto';

export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string; // hash SHA-256 cua refresh token (khong luu token goc)
  jti: string;
  userAgent?: string;
  ip?: string;
  revoked: boolean;
  replacedByJti?: string | null;
  expiresAt: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    jti: { type: String, required: true, unique: true },
    userAgent: { type: String },
    ip: { type: String },
    revoked: { type: Boolean, default: false },
    replacedByJti: { type: String, default: null },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Mongo TTL index: tu dong xoa document sau khi het han
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
