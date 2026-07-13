import { Schema, model, Document } from "mongoose";
import type { MCPRole } from "../types.js";

export interface IMCPSession extends Document {
  sessionId: string;
  userId: string;
  orgId: string;
  role: MCPRole;
  soulContent: string;
  context: {
    companyName: string;
    companyDescription: string;
    userName: string;
    userEmail: string;
  };
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
}

const mcpSessionSchema = new Schema<IMCPSession>(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    orgId: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager", "member"], required: true },
    soulContent: { type: String, default: "" },
    context: {
      companyName: { type: String, default: "" },
      companyDescription: { type: String, default: "" },
      userName: { type: String, default: "" },
      userEmail: { type: String, default: "" },
    },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

mcpSessionSchema.index({ orgId: 1, userId: 1 });
mcpSessionSchema.index({ sessionId: 1 }, { unique: true });

export const MCPSession = model<IMCPSession>("MCPSession", mcpSessionSchema);