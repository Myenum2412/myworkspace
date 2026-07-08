import { Schema, model, Document } from "mongoose";

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

const storageQuotaSchema = new Schema<IStorageQuota>(
  {
    orgId: { type: String, required: true, unique: true },
    maxStorageBytes: { type: Number, default: 10 * 1024 * 1024 * 1024 },
    usedStorageBytes: { type: Number, default: 0 },
    maxFileSizeBytes: { type: Number, default: 100 * 1024 * 1024 },
    allowedMimeTypes: { type: [String], default: [] },
    userStorageLimitBytes: { type: Number, default: 1024 * 1024 * 1024 },
    versioningEnabled: { type: Boolean, default: true },
    retentionDays: { type: Number, default: 30 },
  },
  { timestamps: true }
);

export const StorageQuota = model<IStorageQuota>("StorageQuota", storageQuotaSchema);

export interface PlanLimits {
  maxStorageBytes: number;
  maxFileSizeBytes: number;
  userStorageLimitBytes: number;
}

const planToStorageLimits: Record<string, PlanLimits> = {
  free: {
    maxStorageBytes: 10 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 100 * 1024 * 1024,
    userStorageLimitBytes: 1024 * 1024 * 1024,
  },
  trial: {
    maxStorageBytes: 10 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 100 * 1024 * 1024,
    userStorageLimitBytes: 1024 * 1024 * 1024,
  },
  starter: {
    maxStorageBytes: 100 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 10 * 1024 * 1024 * 1024,
    userStorageLimitBytes: 10 * 1024 * 1024 * 1024,
  },
  professional: {
    maxStorageBytes: 1024 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 10 * 1024 * 1024 * 1024,
    userStorageLimitBytes: 50 * 1024 * 1024 * 1024,
  },
  enterprise: {
    maxStorageBytes: 9999 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 10 * 1024 * 1024 * 1024,
    userStorageLimitBytes: 100 * 1024 * 1024 * 1024,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return planToStorageLimits[plan] || planToStorageLimits.free;
}
