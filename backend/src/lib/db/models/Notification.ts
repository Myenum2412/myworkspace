import { Schema, model, Document } from "mongoose";

export const NOTIFICATION_TYPES = [
  // User & Authentication
  "workspace_registered",
  "organization_created",
  "workspace_welcome",
  "user_invited",
  "user_account_created",
  "user_activation",
  "email_verified",
  "password_setup_invite",
  "password_reset",
  "password_changed",
  "new_device_login",
  "failed_login",
  "account_locked",
  "account_unlocked",
  "account_suspended",
  "account_reactivated",
  "role_changed",
  "permission_updated",
  "profile_updated",
  "account_deleted",
  "subscription_activated",
  "subscription_upgraded",
  "subscription_downgraded",
  "subscription_renewed",
  "subscription_expired",
  "subscription_cancelled",
  "subscription_nearing_expiration",

  // Project Management
  "project_created",
  "project_updated",
  "project_archived",
  "project_restored",
  "project_deleted",
  "project_assigned",
  "project_ownership_transferred",
  "project_deadline_changed",
  "project_status_changed",
  "project_completed",
  "project_reopened",
  "project_budget_updated",
  "milestone_created",
  "milestone_updated",
  "milestone_completed",
  "milestone_delayed",
  "project_health_at_risk",

  // Task Management
  "task_assigned",
  "task_reassigned",
  "task_accepted",
  "task_declined",
  "task_started",
  "task_paused",
  "task_resumed",
  "task_on_hold",
  "task_overdue",
  "task_due_today",
  "task_due_tomorrow",
  "task_completed",
  "task_reopened",
  "task_rejected",
  "task_approved",
  "task_priority_changed",
  "task_dependencies_completed",
  "task_checklist_updated",
  "task_comment_added",
  "task_attachment_added",
  "task_estimated_hours_updated",
  "task_actual_hours_submitted",
  "task_updated",
  "task_created",

  // File Management
  "file_uploaded",
  "file_bulk_uploaded",
  "folder_created",
  "folder_renamed",
  "file_renamed",
  "file_moved",
  "file_copied",
  "file_shared",
  "file_downloaded",
  "file_previewed",
  "file_approved",
  "file_rejected",
  "file_deleted",
  "file_restored",
  "file_permanently_deleted",
  "storage_nearing_limit",
  "storage_exceeded",
  "virus_scan_failed",
  "upload_failed",
  "upload_completed",

  // Approval Workflow
  "approval_requested",
  "approval_pending",
  "approval_approved",
  "approval_rejected",
  "approval_cancelled",
  "approval_escalated",
  "approval_overdue",
  "approval_level_progressed",

  // Permission & Access
  "permission_granted",
  "permission_revoked",
  "role_updated",
  "department_access_changed",
  "workspace_access_changed",
  "client_portal_access_granted",
  "api_key_generated",
  "api_key_revoked",
  "suspicious_permission_change",

  // HR & Employee
  "employee_onboarded",
  "employee_terminated",
  "leave_request_submitted",
  "leave_approved",
  "leave_rejected",
  "attendance_anomaly",
  "payroll_processed",
  "salary_credited",
  "performance_review_scheduled",
  "performance_review_completed",
  "training_assigned",
  "certification_expired",

  // Client Management
  "client_created",
  "client_updated",
  "client_assigned",
  "client_invitation_sent",
  "client_invitation_accepted",
  "client_uploaded_files",
  "client_approved_deliverables",
  "client_rejected_deliverables",
  "contract_signed",
  "proposal_accepted",
  "proposal_rejected",

  // Communication
  "new_comment",
  "mention",
  "reply_received",
  "chat_message",
  "team_announcement",
  "broadcast_message",
  "meeting_scheduled",
  "meeting_reminder",
  "meeting_cancelled",
  "calendar_invitation",

  // Billing & Subscription
  "invoice_generated",
  "invoice_paid",
  "payment_failed",
  "refund_processed",
  "subscription_renewal_reminder",
  "trial_ending",
  "storage_upgrade_available",
  "plan_limit_reached",
  "additional_users_purchased",

  // Security
  "suspicious_login",
  "email_changed",
  "api_abuse_detected",
  "rate_limit_exceeded",
  "unauthorized_access_attempt",

  // System
  "scheduled_maintenance",
  "system_outage",
  "service_restored",
  "backup_completed",
  "backup_failed",
  "database_maintenance",
  "new_feature_announcement",
  "platform_update",
  "version_release",

  // Legacy
  "system",
  "announcement",
  "team_update",
  "message",
  "comment",
  "status_change",
  "billing_reminder",
  "invite",
  "draft_published",
  "task_published",
  "task_activated",
  "task_due_soon",
  "task_submitted",
  "project_update",
  "approval_request",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CATEGORIES = [
  "auth",
  "projects",
  "tasks",
  "files",
  "approvals",
  "permissions",
  "hr",
  "clients",
  "messages",
  "billing",
  "security",
  "system",
  "team",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_FREQUENCIES = ["instant", "hourly", "daily", "weekly"] as const;
export type NotificationFrequency = (typeof NOTIFICATION_FREQUENCIES)[number];

export interface INotificationAction {
  label: string;
  action: string;
  url?: string;
  icon?: string;
  primary?: boolean;
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
  avatar?: string;
  read: boolean;
  readAt?: Date;
  archived: boolean;
  archivedAt?: Date;
  snoozedUntil?: Date;
  link?: string;
  deepLink?: string;
  actions: INotificationAction[];
  metadata?: string;
  source?: string;
  correlationId?: string;
  tenantId?: string;
  delivered: boolean;
  deliveredAt?: Date;
  channels: string[];
  emailSent: boolean;
  pushSent: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationActionSchema = new Schema<INotificationAction>(
  {
    label: { type: String, required: true },
    action: { type: String, required: true },
    url: String,
    icon: String,
    primary: Boolean,
  },
  { _id: false }
);

const notificationSchema = new Schema<INotification>(
  {
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
      default: "medium",
    },
    title: { type: String, required: true },
    message: String,
    icon: String,
    avatar: String,
    read: { type: Boolean, default: false },
    readAt: Date,
    archived: { type: Boolean, default: false },
    archivedAt: Date,
    snoozedUntil: Date,
    link: String,
    deepLink: String,
    actions: { type: [NotificationActionSchema], default: [] },
    metadata: String,
    source: String,
    correlationId: String,
    tenantId: String,
    delivered: { type: Boolean, default: false },
    deliveredAt: Date,
    channels: { type: [String], default: ["in_app"] },
    emailSent: { type: Boolean, default: false },
    pushSent: { type: Boolean, default: false },
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, archived: 1, createdAt: -1 });
notificationSchema.index({ orgId: 1, createdAt: -1 });
notificationSchema.index({ orgId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ correlationId: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });

export const Notification = model<INotification>("Notification", notificationSchema);
