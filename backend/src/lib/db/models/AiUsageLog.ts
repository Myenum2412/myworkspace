import { Schema, model, Document } from "mongoose";

export interface IAiUsageLog extends Document {
  orgId: string;
  userId: string;
  date: Date;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  executionTimeMs: number;
  aiModel: string;
  createdAt: Date;
}

const aiUsageLogSchema = new Schema<IAiUsageLog>({
  orgId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  requests: { type: Number, default: 0 },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  estimatedCost: { type: Number, default: 0 },
  executionTimeMs: { type: Number, default: 0 },
  aiModel: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

aiUsageLogSchema.index({ orgId: 1, date: -1 });
aiUsageLogSchema.index({ orgId: 1, userId: 1, date: -1 });

export const AiUsageLog = model<IAiUsageLog>("AiUsageLog", aiUsageLogSchema);
