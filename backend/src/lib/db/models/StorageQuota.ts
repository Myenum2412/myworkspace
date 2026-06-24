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
