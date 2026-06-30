import { Schema, model, Document } from "mongoose";

export type UploadSessionStatus = "pending" | "finalized" | "duplicate" | "expired" | "cancelled" | "pending_approval";

export interface IUploadSession extends Document {
  tusId: string;
  uploadId: string;
  orgId: string;
  workspaceId: string | null;
  projectId: string | null;
  clientId: string | null;
  staffId: string | null;
  departmentId: string | null;
  folderId: string | null;
  uploaderId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  status: UploadSessionStatus;
  needsApproval: boolean;
  fileId: string | null;
  metadata: Record<string, string>;
  durationMs: number;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

const uploadSessionSchema = new Schema<IUploadSession>(
  {
    tusId: { type: String, required: true, unique: true, index: true },
    uploadId: { type: String, default: "", index: true },
    orgId: { type: String, required: true, index: true },
    workspaceId: { type: String, default: null },
    projectId: { type: String, default: null },
    clientId: { type: String, default: null },
    staffId: { type: String, default: null },
    departmentId: { type: String, default: null },
    folderId: { type: String, default: null },
    uploaderId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    originalName: { type: String, default: "" },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    checksum: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "finalized", "duplicate", "expired", "cancelled", "pending_approval"],
      default: "pending",
      index: true,
    },
    needsApproval: { type: Boolean, default: false },
    fileId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    durationMs: { type: Number, default: 0 },
    retryCount: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

uploadSessionSchema.index({ orgId: 1, checksum: 1 });
uploadSessionSchema.index({ status: 1, updatedAt: 1 });
uploadSessionSchema.index({ uploaderId: 1, status: 1 });
uploadSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

export const UploadSession = model<IUploadSession>("UploadSession", uploadSessionSchema);
