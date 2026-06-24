import { Schema, model, Document } from "mongoose";

export interface IFolder extends Document {
  id: string;
  orgId: string;
  clientId: string | null;
  parentId: string | null;
  name: string;
  path: string;
  permissions?: {
    clientCanView: boolean;
    clientCanUpload: boolean;
    clientCanDelete: boolean;
  };
  createdBy: string;
  updatedBy?: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    clientId: { type: String, default: null, index: true },
    parentId: { type: String, default: null, index: true },
    name: { type: String, required: true },
    path: { type: String, required: true },
    permissions: {
      clientCanView: { type: Boolean, default: true },
      clientCanUpload: { type: Boolean, default: true },
      clientCanDelete: { type: Boolean, default: false },
    },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

folderSchema.index({ orgId: 1, parentId: 1 });
folderSchema.index({ orgId: 1, clientId: 1 });
folderSchema.index({ orgId: 1, clientId: 1, path: 1 }, { unique: true });

export const Folder = model<IFolder>("Folder", folderSchema);
