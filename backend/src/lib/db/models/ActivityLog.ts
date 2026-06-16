import { Schema, model, Document, Types } from "mongoose";

export interface IActivityLog extends Document {
  orgId: Types.ObjectId;
  userId: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>({
  orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: String,
  description: { type: String, required: true },
  metadata: String,
  createdAt: { type: Date, default: Date.now },
});

export const ActivityLog = model<IActivityLog>("ActivityLog", activityLogSchema);
