import { Schema, model, Document } from "mongoose";

export interface IFileVersion extends Document {
  fileId: string;
  orgId: string;
  versionNumber: number;
  storagePath: string;
  size: number;
  checksum: string;
  uploadedBy: string;
  mimeType: string;
  originalName: string;
  comment: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

const fileVersionSchema = new Schema<IFileVersion>(
  {
    fileId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    versionNumber: { type: Number, required: true },
    storagePath: { type: String, required: true },
    size: { type: Number, required: true },
    checksum: { type: String, default: "" },
    uploadedBy: { type: String, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    originalName: { type: String, default: "" },
    comment: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

fileVersionSchema.index({ fileId: 1, versionNumber: -1 });
fileVersionSchema.index({ orgId: 1, checksum: 1 });

export const FileVersion = model<IFileVersion>("FileVersion", fileVersionSchema);
