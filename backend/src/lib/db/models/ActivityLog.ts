import { Schema, model, Document } from "mongoose";

export interface IActivityLog extends Document {
  orgId: string;
  userId: string;
  createdBy: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>({
  orgId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  createdBy: { type: String, required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: String,
  description: { type: String, required: true },
  metadata: String,
  createdAt: { type: Date, default: Date.now },
});

export const ActivityLog = model<IActivityLog>("ActivityLog", activityLogSchema);
