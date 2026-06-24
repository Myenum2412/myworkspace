import { Schema, model, Document } from "mongoose";

export interface IFileVersion extends Document {
  id: string;
  orgId: string;
  fileId: string;
  versionNumber: number;
  storagePath: string;
  size: number;
  uploadedBy: string;
  createdBy: string;
  comment: string;
  createdAt: Date;
}

const fileVersionSchema = new Schema<IFileVersion>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    fileId: { type: String, required: true, index: true },
    versionNumber: { type: Number, required: true },
    storagePath: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String, required: true },
    createdBy: { type: String, required: true },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

fileVersionSchema.index({ orgId: 1, fileId: 1, versionNumber: -1 });

export const FileVersion = model<IFileVersion>("FileVersion", fileVersionSchema);
