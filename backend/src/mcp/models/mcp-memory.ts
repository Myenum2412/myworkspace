import { Schema, model, Document } from "mongoose";

export interface IMCPMemory extends Document {
  sessionId: string;
  userId: string;
  orgId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const mcpMemorySchema = new Schema<IMCPMemory>(
  {
    sessionId: { type: String, required: true },
    userId: { type: String, required: true },
    orgId: { type: String, required: true },
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

mcpMemorySchema.index({ sessionId: 1, timestamp: 1 });
mcpMemorySchema.index({ orgId: 1, userId: 1, timestamp: -1 });

export const MCPMemory = model<IMCPMemory>("MCPMemory", mcpMemorySchema);