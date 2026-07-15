import { Schema, model, Document, Types } from "mongoose";

export interface IAiMessage extends Document {
  conversationId: Types.ObjectId;
  orgId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  prompt?: string;
  responseId?: string;
  aiModel?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  executionTime?: number;
  files?: Array<{
    name: string;
    type: string;
    size: number;
    url?: string;
  }>;
  metadata?: Record<string, unknown>;
  feedback?: "like" | "dislike" | null;
  createdAt: Date;
}

const aiMessageSchema = new Schema<IAiMessage>({
  conversationId: { type: Schema.Types.ObjectId, ref: "AiConversation", required: true, index: true },
  orgId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  role: { type: String, enum: ["user", "assistant", "system"], required: true },
  content: { type: String, required: true },
  prompt: String,
  responseId: String,
  aiModel: { type: String },
  tokens: {
    prompt: Number,
    completion: Number,
    total: Number,
  },
  executionTime: Number,
  files: [{
    name: String,
    type: String,
    size: Number,
    url: String,
  }],
  metadata: { type: Schema.Types.Mixed },
  feedback: { type: String, enum: ["like", "dislike", null], default: null },
  createdAt: { type: Date, default: Date.now },
});

aiMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const AiMessage = model<IAiMessage>("AiMessage", aiMessageSchema);
