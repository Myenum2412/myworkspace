import { Schema, model, Document } from "mongoose";

export const NOTIFICATION_TYPES = [
  "task_assigned",
  "task_updated",
  "task_due_soon",
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
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CATEGORIES = [
  "tasks",
  "projects",
  "messages",
  "billing",
  "approvals",
  "team",
  "system",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export interface INotificationAction {
  label: string;
  action: string;
  url?: string;
}

export interface INotification extends Document {
  userId: string;
  orgId: string;
  createdBy: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message?: string;
  icon?: string;
  read: boolean;
  readAt?: Date;
  archived: boolean;
  link?: string;
  actions: INotificationAction[];
  metadata?: string;
  createdAt: Date;
}

const NotificationActionSchema = new Schema<INotificationAction>(
  {
    label: { type: String, required: true },
    action: { type: String, required: true },
    url: String,
  },
  { _id: false }
);

const notificationSchema = new Schema<INotification>({
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

export const Notification = model<INotification>("Notification", notificationSchema);
