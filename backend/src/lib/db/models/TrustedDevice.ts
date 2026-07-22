import { Schema, model, Document } from "mongoose";

export interface ITrustedDevice extends Document {
  userId: string;
  deviceFingerprint: string;
  deviceName: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const trustedDeviceSchema = new Schema<ITrustedDevice>({
  userId: { type: String, required: true, index: true },
  deviceFingerprint: { type: String, required: true },
  deviceName: { type: String, default: "Unknown device" },
  ipAddress: { type: String },
  userAgent: { type: String },
  expiresAt: { type: Date, required: true },
  lastUsedAt: { type: Date, default: Date.now },
}, { timestamps: true });

trustedDeviceSchema.index({ userId: 1, deviceFingerprint: 1 }, { unique: true });
trustedDeviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TrustedDevice = model<ITrustedDevice>("TrustedDevice", trustedDeviceSchema);
