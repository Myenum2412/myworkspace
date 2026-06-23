import { Schema, model } from "mongoose";
const activityLogSchema = new Schema({
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: String,
    description: { type: String, required: true },
    metadata: String,
    createdAt: { type: Date, default: Date.now },
});
export const ActivityLog = model("ActivityLog", activityLogSchema);
