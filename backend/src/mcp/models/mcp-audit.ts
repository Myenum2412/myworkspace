import { Schema, model, Document } from "mongoose";

export interface IMCPAudit extends Document {
  requestId: string;
  sessionId: string;
  userId: string;
  orgId: string;
  action: string;
  tool: string;
  params: Record<string, unknown>;
  result: string;
  ip?: string;
  timestamp: Date;
  durationMs: number;
}

const mcpAuditSchema = new Schema<IMCPAudit>(
  {
    requestId: { type: String, required: true, unique: true },
    sessionId: { type: String, required: true },
    userId: { type: String, required: true },
    orgId: { type: String, required: true },
    action: { type: String, required: true },
    tool: { type: String, required: true },
    params: { type: Schema.Types.Mixed },
    result: { type: String, required: true },
    ip: { type: String },
    timestamp: { type: Date, default: Date.now },
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

mcpAuditSchema.index({ orgId: 1, timestamp: -1 });
mcpAuditSchema.index({ sessionId: 1, timestamp: -1 });
mcpAuditSchema.index({ userId: 1, timestamp: -1 });

export const MCPAudit = model<IMCPAudit>("MCPAudit", mcpAuditSchema);