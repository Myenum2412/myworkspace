import mongoose, { Schema, model } from "mongoose";

export interface IConsentRecord {
  id: string;
  userId?: string;
  orgId?: string;
  anonymousId?: string;
  consentVersion: number;
  categories: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    performance: boolean;
    personalization: boolean;
    marketing: boolean;
  };
  source: "banner" | "preferences-center" | "account-settings" | "api" | "system";
  ipAddress?: string;
  userAgent?: string;
  region: string;
  gdprApplies: boolean;
  ccpaApplies: boolean;
  lgpdApplies: boolean;
  pipedaApplies: boolean;
  consentTimestamp: Date;
  consentExpiresAt?: Date;
  previousConsentId?: string;
  policyVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const consentRecordSchema = new Schema<IConsentRecord>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    orgId: { type: String, index: true },
    anonymousId: { type: String, index: true },
    consentVersion: { type: Number, required: true, default: 1 },
    categories: {
      essential: { type: Boolean, required: true, default: true },
      functional: { type: Boolean, required: true, default: false },
      analytics: { type: Boolean, required: true, default: false },
      performance: { type: Boolean, required: true, default: false },
      personalization: { type: Boolean, required: true, default: false },
      marketing: { type: Boolean, required: true, default: false },
    },
    source: {
      type: String,
      required: true,
      enum: ["banner", "preferences-center", "account-settings", "api", "system"],
    },
    ipAddress: String,
    userAgent: String,
    region: { type: String, required: true },
    gdprApplies: { type: Boolean, default: false },
    ccpaApplies: { type: Boolean, default: false },
    lgpdApplies: { type: Boolean, default: false },
    pipedaApplies: { type: Boolean, default: false },
    consentTimestamp: { type: Date, required: true, default: Date.now },
    consentExpiresAt: Date,
    previousConsentId: String,
    policyVersion: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

consentRecordSchema.index({ userId: 1, consentVersion: -1 });
consentRecordSchema.index({ anonymousId: 1, consentVersion: -1 });
consentRecordSchema.index({ consentTimestamp: -1 });
consentRecordSchema.index({ region: 1, consentTimestamp: -1 });

export const ConsentRecord =
  mongoose.models.ConsentRecord || model("ConsentRecord", consentRecordSchema, "consent_records");
