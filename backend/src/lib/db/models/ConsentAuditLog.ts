import mongoose, { Schema, model } from "mongoose";

export interface IConsentAuditLog {
  id: string;
  consentId: string;
  userId?: string;
  orgId?: string;
  anonymousId?: string;
  action: "created" | "updated" | "withdrawn" | "expired" | "exported" | "deleted";
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  region: string;
  source: string;
  policyVersion: number;
  performedBy?: string;
  createdAt: Date;
}

const consentAuditLogSchema = new Schema<IConsentAuditLog>(
  {
    id: { type: String, required: true, unique: true },
    consentId: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    orgId: String,
    anonymousId: String,
    action: {
      type: String,
      required: true,
      enum: ["created", "updated", "withdrawn", "expired", "exported", "deleted"],
    },
    previousState: Schema.Types.Mixed,
    newState: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    region: { type: String, required: true },
    source: { type: String, required: true },
    policyVersion: { type: Number, required: true },
    performedBy: String,
  },
  { timestamps: true }
);

consentAuditLogSchema.index({ userId: 1, createdAt: -1 });
consentAuditLogSchema.index({ createdAt: -1 });
consentAuditLogSchema.index({ action: 1, createdAt: -1 });

export const ConsentAuditLog =
  mongoose.models.ConsentAuditLog || model("ConsentAuditLog", consentAuditLogSchema, "consent_audit_logs");
