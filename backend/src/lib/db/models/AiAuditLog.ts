import { Schema, model, Document } from "mongoose";

export interface IAiAuditLog extends Document {
  orgId: string;
  userId: string;
  action: string;
  prompt: string;
  responseId?: string;
  aiModel?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  executionTime?: number;
  files?: string[];
  ip?: string;
  userAgent?: string;
  status: "success" | "failure";
  error?: string;
  createdAt: Date;
}

const aiAuditLogSchema = new Schema<IAiAuditLog>({
  orgId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  prompt: { type: String, required: true },
  responseId: String,
  aiModel: { type: String },
  tokens: {
    prompt: Number,
    completion: Number,
    total: Number,
  },
  executionTime: Number,
  files: [String],
  ip: String,
  userAgent: String,
  status: { type: String, enum: ["success", "failure"], required: true },
  error: String,
  createdAt: { type: Date, default: Date.now },
});

aiAuditLogSchema.index({ orgId: 1, createdAt: -1 });
aiAuditLogSchema.index({ userId: 1, createdAt: -1 });
aiAuditLogSchema.index({ action: 1, createdAt: -1 });

export const AiAuditLog = model<IAiAuditLog>("AiAuditLog", aiAuditLogSchema);
