import { Schema, model, Document } from "mongoose";

export interface IUploadApproval extends Document {
  uploadId: string;
  tusId: string;
  orgId: string;
  uploaderId: string;
  uploaderRole: string;
  approvedBy: string | null;
  status: "pending" | "approved" | "rejected";
  fileName: string;
  fileSize: number;
  mimeType: string;
  folderId: string | null;
  projectId: string | null;
  workspaceId: string | null;
  clientId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string;
  createdAt: Date;
  updatedAt: Date;
}

const uploadApprovalSchema = new Schema<IUploadApproval>(
  {
    uploadId: { type: String, required: true, unique: true, index: true },
    tusId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    uploaderId: { type: String, required: true, index: true },
    uploaderRole: { type: String, required: true },
    approvedBy: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    fileName: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: "application/octet-stream" },
    folderId: { type: String, default: null },
    projectId: { type: String, default: null },
    workspaceId: { type: String, default: null },
    clientId: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true },
);

uploadApprovalSchema.index({ orgId: 1, status: 1 });
uploadApprovalSchema.index({ approvedBy: 1, status: 1 });

export const UploadApproval = model<IUploadApproval>("UploadApproval", uploadApprovalSchema);
