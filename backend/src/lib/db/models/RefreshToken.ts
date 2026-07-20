import { Schema, model, Document } from "mongoose";

export interface IRefreshToken extends Document {
  token: string;
  userId: string;
  orgId: string;
  family: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedBy?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
    replacedBy: { type: String },
    deviceFingerprint: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ userId: 1, family: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<IRefreshToken>("RefreshToken", refreshTokenSchema);
