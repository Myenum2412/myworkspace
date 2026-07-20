import { Schema, model, Document } from "mongoose";

export interface IActivityLog extends Document {
  orgId: string;
  userId: string;
  createdBy?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  metadata?: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>({
  orgId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  createdBy: { type: String },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: String,
  description: { type: String, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  success: { type: Boolean },
  metadata: String,
  createdAt: { type: Date, default: Date.now, index: true },
});

export const ActivityLog = model<IActivityLog>("ActivityLog", activityLogSchema);
