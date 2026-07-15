import { Schema, model, Document } from "mongoose";

export interface IAiConversation extends Document {
  orgId: string;
  userId: string;
  title: string;
  context: "workspace" | "staff";
  workspaceContext?: {
    workspaceName?: string;
    companyName?: string;
    project?: string;
    client?: string;
    currentPage?: string;
  };
  isPinned: boolean;
  messageCount: number;
  totalTokens: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const aiConversationSchema = new Schema<IAiConversation>(
  {
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, default: "New Conversation" },
    context: { type: String, enum: ["workspace", "staff"], required: true },
    workspaceContext: {
      workspaceName: String,
      companyName: String,
      project: String,
      client: String,
      currentPage: String,
    },
    isPinned: { type: Boolean, default: false },
    messageCount: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
    deletedAt: Date,
  },
  { timestamps: true }
);

aiConversationSchema.index({ orgId: 1, userId: 1, lastActivityAt: -1 });
aiConversationSchema.index({ orgId: 1, context: 1 });
aiConversationSchema.index({ userId: 1, isPinned: -1 });

export const AiConversation = model<IAiConversation>("AiConversation", aiConversationSchema);
