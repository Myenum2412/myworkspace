import { Schema, model } from "mongoose";
export const NOTIFICATION_TYPES = [
    "task_assigned",
    "task_updated",
    "task_due_soon",
    "task_submitted",
    "task_approved",
    "task_rejected",
    "task_published",
    "task_activated",
    "draft_published",
    "mention",
    "invite",
    "system",
    "comment",
    "status_change",
    "message",
    "project_update",
    "billing_reminder",
    "approval_request",
    "team_update",
    "announcement",
];
export const NOTIFICATION_CATEGORIES = [
    "tasks",
    "projects",
    "messages",
    "billing",
    "approvals",
    "team",
    "system",
];
export const NOTIFICATION_PRIORITIES = ["low", "normal", "high", "urgent"];
const NotificationActionSchema = new Schema({
    label: { type: String, required: true },
    action: { type: String, required: true },
    url: String,
}, { _id: false });
const notificationSchema = new Schema({
    userId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },
    type: {
        type: String,
        enum: NOTIFICATION_TYPES,
        required: true,
    },
    category: {
        type: String,
        enum: NOTIFICATION_CATEGORIES,
        default: "system",
    },
    priority: {
        type: String,
        enum: NOTIFICATION_PRIORITIES,
        default: "normal",
    },
    title: { type: String, required: true },
    message: String,
    icon: String,
    read: { type: Boolean, default: false },
    readAt: Date,
    archived: { type: Boolean, default: false },
    link: String,
    actions: { type: [NotificationActionSchema], default: [] },
    metadata: String,
    createdAt: { type: Date, default: Date.now },
});
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ orgId: 1, createdAt: -1 });
export const Notification = model("Notification", notificationSchema);
