import { Schema, model, Document } from "mongoose";

export interface IShareLink extends Document {
  id: string;
  fileId: string;
  createdBy: string;
  updatedBy?: string;
  orgId: string;
  token: string;
  isPublic: boolean;
  password: string | null;
  expiresAt: Date | null;
  maxDownloads: number | null;
  downloadCount: number;
  allowDownload: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shareLinkSchema = new Schema<IShareLink>(
  {
    id: { type: String, required: true, unique: true },
    fileId: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
    orgId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    isPublic: { type: Boolean, default: false },
    password: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    maxDownloads: { type: Number, default: null },
    downloadCount: { type: Number, default: 0 },
    allowDownload: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shareLinkSchema.index({ token: 1 });
shareLinkSchema.index({ fileId: 1, isActive: 1 });

export const ShareLink = model<IShareLink>("ShareLink", shareLinkSchema);
