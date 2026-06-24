import { Schema, model, Document } from "mongoose";

export interface IClientAuditLog extends Document {
  orgId: string;
  clientId?: string;
  clientUserId?: string;
  createdBy: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: string;
  ipAddress?: string;
  createdAt: Date;
}

const clientAuditLogSchema = new Schema<IClientAuditLog>({
  orgId: { type: String, required: true, index: true },
  clientId: { type: String, index: true },
  clientUserId: { type: String, index: true },
  createdBy: { type: String, required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: String,
  description: { type: String, required: true },
  metadata: String,
  ipAddress: String,
  createdAt: { type: Date, default: Date.now },
});

export const ClientAuditLog = model<IClientAuditLog>("ClientAuditLog", clientAuditLogSchema);
