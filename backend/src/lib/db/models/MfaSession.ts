import { Schema, model, Document } from "mongoose";

export interface IMfaSession extends Document {
  userId: string;
  sessionId: string;
  mfaVerified: boolean;
  mfaMethod: string;
  mfaVerifiedAt: Date;
  trustedDevice: boolean;
  deviceFingerprint?: string;
  authMethod: "password" | "oauth" | "sso" | "api_key" | "recovery_code" | "impersonation";
  riskLevel: "low" | "medium" | "high" | "critical";
  riskScore: number;
  ipAddress?: string;
  userAgent?: string;
  orgId: string;
  expiresAt: Date;
  createdAt: Date;
}

const mfaSessionSchema = new Schema<IMfaSession>({
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, unique: true, index: true },
  mfaVerified: { type: Boolean, required: true, default: false },
  mfaMethod: { type: String, default: "none" },
  mfaVerifiedAt: Date,
  trustedDevice: { type: Boolean, default: false },
  deviceFingerprint: String,
  authMethod: {
    type: String,
    enum: ["password", "oauth", "sso", "api_key", "recovery_code", "impersonation"],
    required: true,
  },
  riskLevel: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "low",
  },
  riskScore: { type: Number, default: 0 },
  ipAddress: String,
  userAgent: String,
  orgId: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

mfaSessionSchema.index({ userId: 1, expiresAt: -1 });
mfaSessionSchema.index({ sessionId: 1 });

export const MfaSession = model<IMfaSession>("MfaSession", mfaSessionSchema);
