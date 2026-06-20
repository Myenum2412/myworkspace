import { Schema, model, Document } from "mongoose";

export interface IFileAttachment extends Document {
  id: string;
  orgId: string;
  uploaderId: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const fileAttachmentSchema = new Schema<IFileAttachment>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true },
    uploaderId: { type: String, required: true },
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storagePath: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const FileAttachment = model<IFileAttachment>("FileAttachment", fileAttachmentSchema);
