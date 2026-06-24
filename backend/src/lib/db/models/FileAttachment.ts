import { Schema, model, Document } from "mongoose";

export type FileCategory = "profile" | "report" | "general" | "document" | "image" | "video" | "audio" | "archive";

export interface IFileAttachment extends Document {
  id: string;
  orgId: string;
  clientId: string | null;
  folderId: string | null;
  uploaderId: string;
  createdBy: string;
  updatedBy?: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  storageProvider: "local" | "r2" | "s3" | "gcs" | "azure";
  category: FileCategory;
  description: string;
  tags: string[];
  isLocked: boolean;
  lockedBy: string | null;
  currentVersion: number;
  checksum: string;
  isDuplicate: boolean;
  duplicateOf: string | null;
  lastAccessedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const fileAttachmentSchema = new Schema<IFileAttachment>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    clientId: { type: String, default: null, index: true },
    folderId: { type: String, default: null, index: true },
    uploaderId: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storagePath: { type: String, required: true },
    storageProvider: { type: String, enum: ["local", "r2", "s3", "gcs", "azure"], default: "local" },
    category: { type: String, enum: ["profile", "report", "general", "document", "image", "video", "audio", "archive"], default: "general" },
    description: { type: String, default: "" },
    tags: { type: [String], default: [] },
    isLocked: { type: Boolean, default: false },
    lockedBy: { type: String, default: null },
    currentVersion: { type: Number, default: 1 },
    checksum: { type: String, default: "" },
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: String, default: null },
    lastAccessedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
  },
  { timestamps: true }
);

fileAttachmentSchema.index({ orgId: 1, folderId: 1 });
fileAttachmentSchema.index({ orgId: 1, clientId: 1 });
fileAttachmentSchema.index({ orgId: 1, deletedAt: 1 });
fileAttachmentSchema.index({ orgId: 1, name: "text", description: "text", tags: "text" });
fileAttachmentSchema.index({ orgId: 1, mimeType: 1 });
fileAttachmentSchema.index({ orgId: 1, uploaderId: 1 });
fileAttachmentSchema.index({ checksum: 1 });

export const FileAttachment = model<IFileAttachment>("FileAttachment", fileAttachmentSchema);
