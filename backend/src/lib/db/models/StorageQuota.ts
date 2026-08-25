import { type Document, model, Schema } from "mongoose";

export interface IStorageQuota extends Document {
  orgId: string;
  maxStorageBytes: number;
  usedStorageBytes: number;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
  userStorageLimitBytes: number;
  versioningEnabled: boolean;
  retentionDays: number;
  createdAt: Date;
  updatedAt: Date;
}

const UNLIMITED = Number.MAX_SAFE_INTEGER;

const storageQuotaSchema = new Schema<IStorageQuota>(
  {
    orgId: { type: String, required: true, unique: true },
    maxStorageBytes: { type: Number, default: UNLIMITED },
    usedStorageBytes: { type: Number, default: 0 },
    maxFileSizeBytes: { type: Number, default: UNLIMITED },
    allowedMimeTypes: { type: [String], default: [] },
    userStorageLimitBytes: { type: Number, default: UNLIMITED },
    versioningEnabled: { type: Boolean, default: true },
    retentionDays: { type: Number, default: 30 },
  },
  { timestamps: true },
);

export const StorageQuota = model<IStorageQuota>("StorageQuota", storageQuotaSchema);

export interface PlanLimits {
  maxStorageBytes: number;
  maxFileSizeBytes: number;
  userStorageLimitBytes: number;
}

const unlimitedPlanLimits: PlanLimits = {
  maxStorageBytes: UNLIMITED,
  maxFileSizeBytes: UNLIMITED,
  userStorageLimitBytes: UNLIMITED,
};

export function getPlanLimits(_plan: string): PlanLimits {
  return unlimitedPlanLimits;
}
