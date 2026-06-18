import { Schema, model, Document } from "mongoose";

export interface IFileShare extends Document {
  id: string;
  fileId: string;
  sharedByUserId: string;
  sharedWithUserId: string | null;
  orgId: string;
  createdAt: Date;
}

const fileShareSchema = new Schema<IFileShare>({
  id: { type: String, required: true, unique: true },
  fileId: { type: String, required: true },
  sharedByUserId: { type: String, required: true },
  sharedWithUserId: { type: String, default: null },
  orgId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const FileShare = model<IFileShare>("FileShare", fileShareSchema);
