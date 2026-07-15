import { Schema, model, Document } from "mongoose";

export interface IAiSettings extends Document {
  orgId: string;
  provider: "openrouter" | "openai" | "claude" | "azure";
  aiModel: string;
  temperature: number;
  maxTokens: number;
  responseLength: "short" | "medium" | "long";
  streamingEnabled: boolean;
  systemPrompt: string;
  allowedFileTypes: string[];
  maxUploadSize: number;
  conversationRetentionDays: number;
  rateLimitRequests: number;
  rateLimitWindowMs: number;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiSettingsSchema = new Schema<IAiSettings>(
  {
    orgId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, enum: ["openrouter", "openai", "claude", "azure"], default: "openrouter" },
    aiModel: { type: String, default: "tencent/hy3:free" },
    temperature: { type: Number, default: 0.7, min: 0, max: 2 },
    maxTokens: { type: Number, default: 4096, min: 256, max: 128000 },
    responseLength: { type: String, enum: ["short", "medium", "long"], default: "medium" },
    streamingEnabled: { type: Boolean, default: true },
    systemPrompt: {
      type: String,
      default: "You are an expert AI assistant for workspace management and structural detailing. Help users with project planning, detailing guidance, documentation, and technical queries.",
    },
    allowedFileTypes: {
      type: [String],
      default: ["pdf", "docx", "xlsx", "csv", "png", "jpg", "jpeg", "gif", "webp"],
    },
    maxUploadSize: { type: Number, default: 50 * 1024 * 1024 },
    conversationRetentionDays: { type: Number, default: 90 },
    rateLimitRequests: { type: Number, default: 100 },
    rateLimitWindowMs: { type: Number, default: 60000 },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const AiSettings = model<IAiSettings>("AiSettings", aiSettingsSchema);
