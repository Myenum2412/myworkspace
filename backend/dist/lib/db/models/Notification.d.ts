import { Document } from "mongoose";
export declare const NOTIFICATION_TYPES: readonly ["task_assigned", "task_updated", "task_due_soon", "mention", "invite", "system", "comment", "status_change", "message", "project_update", "billing_reminder", "approval_request", "team_update", "announcement"];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export declare const NOTIFICATION_CATEGORIES: readonly ["tasks", "projects", "messages", "billing", "approvals", "team", "system"];
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export declare const NOTIFICATION_PRIORITIES: readonly ["low", "normal", "high", "urgent"];
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
export declare const Notification: import("mongoose").Model<INotification, {}, {}, {}, Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
