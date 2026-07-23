import { Notification, NotificationType, NotificationCategory, NotificationPriority, INotificationAction } from "../lib/db/models/Notification.js";
import { NotificationSettings } from "../lib/db/models/NotificationSettings.js";
import { EmailLog } from "../lib/db/models/EmailLog.js";
import { AppError } from "../middleware/error.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { cacheManager } from "../lib/cache.js";
import { sendPushNotification } from "./push.service.js";
import { eventProducer } from "../lib/queue/producer.js";
import { logger } from "../lib/logger/index.js";
import { v4 as uuid } from "uuid";

export interface CreateNotificationParams {
  userId: string;
  orgId: string;
  createdBy: string;
  type: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message?: string;
  icon?: string;
  avatar?: string;
  link?: string;
  deepLink?: string;
  actions?: INotificationAction[];
  metadata?: Record<string, unknown>;
  source?: string;
  channels?: string[];
  correlationId?: string;
  snoozedUntil?: string;
  expiresAt?: string;
  skipDeduplication?: boolean;
}

const CRITICAL_TYPES: NotificationType[] = [
  "suspicious_login", "account_locked", "password_changed", "payment_failed",
  "storage_exceeded", "system_outage", "unauthorized_access_attempt",
];

const CATEGORY_MAP: Record<string, NotificationCategory> = {
  workspace_registered: "auth", organization_created: "auth", workspace_welcome: "auth",
  user_invited: "auth", user_account_created: "auth", user_activation: "auth",
  email_verified: "auth", password_setup_invite: "auth", password_reset: "auth",
  password_changed: "auth", new_device_login: "auth", failed_login: "auth",
  account_locked: "auth",
  account_unlocked: "auth", account_suspended: "auth", account_reactivated: "auth",
  role_changed: "permissions", permission_updated: "permissions", profile_updated: "auth",
  account_deleted: "auth", subscription_activated: "billing", subscription_upgraded: "billing",
  subscription_downgraded: "billing", subscription_renewed: "billing", subscription_expired: "billing",
  subscription_cancelled: "billing", subscription_nearing_expiration: "billing",
  project_created: "projects", project_updated: "projects", project_archived: "projects",
  project_restored: "projects", project_deleted: "projects", project_assigned: "projects",
  project_ownership_transferred: "projects", project_deadline_changed: "projects",
  project_status_changed: "projects", project_completed: "projects", project_reopened: "projects",
  project_budget_updated: "projects", milestone_created: "projects", milestone_updated: "projects",
  milestone_completed: "projects", milestone_delayed: "projects", project_health_at_risk: "projects",
  task_created: "tasks", task_assigned: "tasks", task_reassigned: "tasks", task_accepted: "tasks",
  task_declined: "tasks", task_started: "tasks", task_paused: "tasks", task_resumed: "tasks",
  task_on_hold: "tasks", task_overdue: "tasks", task_due_today: "tasks", task_due_tomorrow: "tasks",
  task_completed: "tasks", task_reopened: "tasks", task_rejected: "tasks", task_approved: "tasks",
  task_priority_changed: "tasks", task_dependencies_completed: "tasks",
  task_checklist_updated: "tasks", task_comment_added: "tasks", task_attachment_added: "tasks",
  task_estimated_hours_updated: "tasks", task_actual_hours_submitted: "tasks", task_updated: "tasks",
  file_uploaded: "files", file_bulk_uploaded: "files", folder_created: "files",
  folder_renamed: "files", file_renamed: "files", file_moved: "files", file_copied: "files",
  file_shared: "files", file_downloaded: "files", file_previewed: "files", file_approved: "files",
  file_rejected: "files", file_deleted: "files", file_restored: "files",
  file_permanently_deleted: "files", storage_nearing_limit: "files", storage_exceeded: "files",
  virus_scan_failed: "files", upload_failed: "files", upload_completed: "files",
  approval_requested: "approvals", approval_pending: "approvals", approval_approved: "approvals",
  approval_rejected: "approvals", approval_cancelled: "approvals", approval_escalated: "approvals",
  approval_overdue: "approvals", approval_level_progressed: "approvals",
  permission_granted: "permissions", permission_revoked: "permissions", role_updated: "permissions",
  department_access_changed: "permissions", workspace_access_changed: "permissions",
  client_portal_access_granted: "permissions", api_key_generated: "permissions",
  api_key_revoked: "permissions", suspicious_permission_change: "permissions",
  employee_onboarded: "hr", employee_terminated: "hr", leave_request_submitted: "hr",
  leave_approved: "hr", leave_rejected: "hr", attendance_anomaly: "hr",
  payroll_processed: "hr", salary_credited: "hr", performance_review_scheduled: "hr",
  performance_review_completed: "hr", training_assigned: "hr", certification_expired: "hr",
  client_created: "clients", client_updated: "clients", client_assigned: "clients",
  client_invitation_sent: "clients", client_invitation_accepted: "clients",
  client_uploaded_files: "clients", client_approved_deliverables: "clients",
  client_rejected_deliverables: "clients", contract_signed: "clients",
  proposal_accepted: "clients", proposal_rejected: "clients",
  new_comment: "messages", mention: "messages", reply_received: "messages",
  chat_message: "messages", team_announcement: "messages", broadcast_message: "messages",
  meeting_scheduled: "messages", meeting_reminder: "messages", meeting_cancelled: "messages",
  calendar_invitation: "messages",
  invoice_generated: "billing", invoice_paid: "billing", payment_failed: "billing",
  refund_processed: "billing", subscription_renewal_reminder: "billing", trial_ending: "billing",
  storage_upgrade_available: "billing", plan_limit_reached: "billing", additional_users_purchased: "billing",
  suspicious_login: "security", email_changed: "security", 
  api_abuse_detected: "security", rate_limit_exceeded: "security", unauthorized_access_attempt: "security",
  scheduled_maintenance: "system", system_outage: "system", service_restored: "system",
  backup_completed: "system", backup_failed: "system", database_maintenance: "system",
  new_feature_announcement: "system", platform_update: "system", version_release: "system",
};

const PRIORITY_MAP: Record<string, NotificationPriority> = {
  suspicious_login: "critical", account_locked: "critical", system_outage: "critical",
  storage_exceeded: "critical", payment_failed: "high", password_changed: "high",
  task_overdue: "high", task_due_today: "high", approval_overdue: "high",
  project_health_at_risk: "high", virus_scan_failed: "high", failed_login: "high",
  unauthorized_access_attempt: "critical", api_abuse_detected: "high",
  task_assigned: "high", mention: "high", approval_requested: "high",
};

export async function createNotification(data: CreateNotificationParams): Promise<any> {
  const { userId, orgId, createdBy, type, title, message, icon, avatar, link, deepLink, actions, metadata, source, channels, correlationId, snoozedUntil, expiresAt, skipDeduplication } = data;

  if (!userId || !type || !title) {
    throw new AppError(400, "userId, type, and title are required");
  }
  if (!orgId) {
    throw new AppError(400, "orgId is required");
  }

  const category = data.category || CATEGORY_MAP[type] || "system";
  const priority = data.priority || PRIORITY_MAP[type] || "medium";

  // Load user settings for channel preference check
  const settings = await NotificationSettings.findOne({ userId }).lean() as any;
  const shouldDeliver = await checkUserNotificationEligibility(userId, type, settings);

  if (!shouldDeliver.allowed) {
    return null;
  }

  // Deduplication check
  if (!skipDeduplication && correlationId) {
    const existing = await Notification.findOne({ correlationId, userId, type }).lean();
    if (existing) {
      logger.debug({ correlationId, userId, type }, "Duplicate notification skipped");
      return null;
    }
  }

  // Build channel list based on settings
  const deliveryChannels = determineChannels(type, category, priority, settings);

  const doc = await Notification.create({
    userId,
    orgId,
    createdBy,
    type,
    category,
    priority,
    title,
    message,
    icon,
    avatar,
    link,
    deepLink,
    actions: actions || [],
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    source: source || "system",
    channels: deliveryChannels,
    correlationId: correlationId || uuid(),
    tenantId: orgId,
    snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : undefined,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    read: false,
    delivered: false,
    createdAt: new Date(),
  });

  const payload = serializeNotification(doc);

  // Deliver via enabled channels
  const deliveryPromises: Promise<void>[] = [];

  if (deliveryChannels.includes("in_app") || deliveryChannels.includes("in-app")) {
    deliveryPromises.push(
      deliverInApp(doc, payload)
    );
  }

  if (deliveryChannels.includes("push")) {
    deliveryPromises.push(
      deliverPush(doc, payload)
    );
  }

  if (deliveryChannels.includes("email")) {
    deliveryPromises.push(
      queueEmailDelivery(doc, payload)
    );
  }

  if (deliveryChannels.includes("webhook")) {
    deliveryPromises.push(
      deliverWebhook(doc, payload)
    );
  }

  await Promise.allSettled(deliveryPromises);

  // Mark as delivered
  await Notification.updateOne({ _id: doc._id }, { delivered: true, deliveredAt: new Date() });

  // Publish to event bus for audit
  try {
    await eventProducer.notificationSend({
      userId, orgId, type, title, message: message || "", link,
    });
  } catch (err) {
    logger.error({ err }, "Failed to publish notification event");
  }

  return payload;
}

async function deliverInApp(doc: any, payload: any): Promise<void> {
  try {
    socketIOManager.emitToUser(doc.userId, "notification", payload);
    // Emit unread count update
    const count = await getUnreadCount(doc.userId);
    socketIOManager.emitUnreadCount(doc.userId, count);
    cacheManager.invalidatePattern(`notifications:${doc.userId}`);
  } catch (err) {
    logger.error({ err, userId: doc.userId }, "In-app delivery failed");
  }
}

async function deliverPush(doc: any, payload: any): Promise<void> {
  try {
    await sendPushNotification(doc.userId, {
      title: doc.title,
      message: doc.message || "",
      icon: doc.icon || "/web-app-manifest-192x192.png",
      link: doc.link,
      badge: doc.priority === "critical" ? "/web-app-manifest-192x192.png" : undefined,
      actions: doc.actions?.map((a: any) => ({
        action: a.action,
        title: a.label,
        url: a.url || doc.link,
      })),
      tag: `notification:${doc._id}`,
    });
  } catch (err: any) {
    logger.error({ err: err.message, userId: doc.userId }, "Push notification failed");
  }
}

async function queueEmailDelivery(doc: any, payload: any): Promise<void> {
  try {
    await eventProducer.publishEvent(
      "notification.events",
      "notification.email.send",
      {
        id: uuid(),
        type: "EmailSend",
        source: "myworkspace.notifications",
        subject: `notification:${doc._id}`,
        data: {
          notificationId: doc._id.toString(),
          userId: doc.userId,
          orgId: doc.orgId,
          type: doc.type,
          title: doc.title,
          message: doc.message,
          link: doc.link,
          category: doc.category,
          correlationId: doc.correlationId,
        },
        timestamp: new Date().toISOString(),
        tenantId: doc.orgId,
      }
    );
  } catch (err) {
    logger.error({ err, notificationId: doc._id }, "Failed to queue email delivery");
  }
}

async function deliverWebhook(doc: any, payload: any): Promise<void> {
  // Webhook delivery is future-ready
  logger.debug({ notificationId: doc._id }, "Webhook delivery skipped (not yet implemented)");
}

async function checkUserNotificationEligibility(
  userId: string,
  type: string,
  settings: any
): Promise<{ allowed: boolean; reason?: string }> {
  if (!settings) return { allowed: true };

  // Critical notifications always go through
  if (CRITICAL_TYPES.includes(type as NotificationType)) {
    return { allowed: true };
  }

  // Check DND
  if (settings.doNotDisturb && settings.dndUntil && new Date(settings.dndUntil) > new Date()) {
    return { allowed: false, reason: "do_not_disturb" };
  }

  // Check quiet hours
  if (settings.quietHoursEnabled) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = (settings.quietHoursStart || "22:00").split(":").map(Number);
    const [endH, endM] = (settings.quietHoursEnd || "08:00").split(":").map(Number);
    const quietStart = startH * 60 + startM;
    const quietEnd = endH * 60 + endM;

    let inQuietHours: boolean;
    if (quietStart <= quietEnd) {
      inQuietHours = currentMinutes >= quietStart && currentMinutes <= quietEnd;
    } else {
      inQuietHours = currentMinutes >= quietStart || currentMinutes <= quietEnd;
    }

    if (inQuietHours) {
      return { allowed: false, reason: "quiet_hours" };
    }
  }

  // Check type-specific enabled
  if (settings.typeSettings?.length > 0) {
    const typeSetting = settings.typeSettings.find((s: any) => s.type === type);
    if (typeSetting && !typeSetting.enabled) {
      return { allowed: false, reason: "type_disabled" };
    }
  }

  // Check muted notifications
  if (settings.mutedNotifications?.length > 0) {
    const muted = settings.mutedNotifications.find(
      (m: any) => m.type === type && (m.mutedForever || (m.mutedUntil && new Date(m.mutedUntil) > new Date()))
    );
    if (muted) {
      return { allowed: false, reason: "muted" };
    }
  }

  return { allowed: true };
}

function determineChannels(
  type: string,
  category: string,
  priority: string,
  settings: any
): string[] {
  if (!settings) {
    return ["in_app", "push"];
  }

  const channels: string[] = [];

  // Category defaults
  const categoryChan = settings.categorySettings?.[category];
  const typeSetting = settings.typeSettings?.find((s: any) => s.type === type);

  // Use type-level channel overrides first
  const chanConfig = typeSetting?.channels || categoryChan || {};

  if (chanConfig.inApp !== false) channels.push("in_app");
  if (chanConfig.email) channels.push("email");
  if (chanConfig.push !== false) channels.push("push");
  if (chanConfig.sms) channels.push("sms");
  if (chanConfig.webhook) channels.push("webhook");

  // Critical notifications always get all channels
  if (priority === "critical" || CRITICAL_TYPES.includes(type as NotificationType)) {
    if (!channels.includes("in_app")) channels.push("in_app");
    if (!channels.includes("email")) channels.push("email");
    if (!channels.includes("push")) channels.push("push");
  }

  return [...new Set(channels)];
}

export async function listNotifications(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    category?: string;
    type?: string;
    priority?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    archived?: boolean;
  }
): Promise<{ notifications: any[]; total: number; unread: number }> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const filter: Record<string, any> = { userId };

  if (options?.archived) {
    filter.archived = true;
  } else {
    filter.archived = { $ne: true };
  }

  if (options?.unreadOnly) filter.read = false;
  if (options?.category) filter.category = options.category;
  if (options?.type) filter.type = options.type;
  if (options?.priority) filter.priority = options.priority;
  if (options?.search) {
    filter.$or = [
      { title: { $regex: options.search, $options: "i" } },
      { message: { $regex: options.search, $options: "i" } },
    ];
  }
  if (options?.startDate || options?.endDate) {
    filter.createdAt = {};
    if (options?.startDate) filter.createdAt.$gte = new Date(options.startDate);
    if (options?.endDate) filter.createdAt.$lte = new Date(options.endDate);
  }

  const [docs, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, read: false, archived: { $ne: true } }),
  ]);

  return {
    notifications: docs.map((d: any) => serializeNotification(d)),
    total,
    unread,
  };
}

export async function searchNotifications(
  userId: string,
  query: string,
  options?: { limit?: number; offset?: number }
): Promise<{ notifications: any[]; total: number }> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const filter: Record<string, any> = {
    userId,
    $or: [
      { title: { $regex: query, $options: "i" } },
      { message: { $regex: query, $options: "i" } },
    ],
  };

  const [docs, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications: docs.map((d: any) => serializeNotification(d)),
    total,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ userId, read: false, archived: { $ne: true } });
}

export async function markAllRead(userId: string): Promise<void> {
  await Notification.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
  cacheManager.invalidatePattern(`notifications:${userId}`);
  socketIOManager.emitUnreadCount(userId, 0);
}

export async function markRead(notificationId: string, userId: string): Promise<any> {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new AppError(404, "Notification not found");
  if (notification.userId.toString() !== userId) throw new AppError(403, "Not authorized");
  notification.read = true;
  notification.readAt = new Date();
  await notification.save();
  cacheManager.invalidatePattern(`notifications:${userId}`);
  const count = await getUnreadCount(userId);
  socketIOManager.emitUnreadCount(userId, count);
  return serializeNotification(notification);
}

export async function archiveNotification(notificationId: string, userId: string): Promise<void> {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new AppError(404, "Notification not found");
  if (notification.userId.toString() !== userId) throw new AppError(403, "Not authorized");
  notification.archived = true;
  notification.archivedAt = new Date();
  await notification.save();
  cacheManager.invalidatePattern(`notifications:${userId}`);
}

export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new AppError(404, "Notification not found");
  if (notification.userId.toString() !== userId) throw new AppError(403, "Not authorized");
  await Notification.findByIdAndDelete(notificationId);
  cacheManager.invalidatePattern(`notifications:${userId}`);
}

export async function clearAll(userId: string): Promise<void> {
  await Notification.updateMany({ userId }, { archived: true, archivedAt: new Date() });
  cacheManager.invalidatePattern(`notifications:${userId}`);
}

export async function bulkArchive(userId: string, ids: string[]): Promise<void> {
  await Notification.updateMany(
    { _id: { $in: ids }, userId },
    { archived: true, archivedAt: new Date() }
  );
  cacheManager.invalidatePattern(`notifications:${userId}`);
}

export async function bulkDelete(userId: string, ids: string[]): Promise<void> {
  await Notification.deleteMany({ _id: { $in: ids }, userId });
  cacheManager.invalidatePattern(`notifications:${userId}`);
}

export async function snoozeNotification(notificationId: string, userId: string, until: Date): Promise<void> {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new AppError(404, "Notification not found");
  if (notification.userId.toString() !== userId) throw new AppError(403, "Not authorized");
  notification.snoozedUntil = until;
  await notification.save();
}

export async function getNotificationAnalytics(
  orgId: string,
  options?: { startDate?: string; endDate?: string }
): Promise<any> {
  const filter: Record<string, any> = { orgId };
  if (options?.startDate || options?.endDate) {
    filter.createdAt = {};
    if (options?.startDate) filter.createdAt.$gte = new Date(options.startDate);
    if (options?.endDate) filter.createdAt.$lte = new Date(options.endDate);
  }

  const [
    totalSent,
    totalRead,
    totalArchived,
    byCategory,
    byType,
    byPriority,
    dailyCounts,
  ] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, read: true }),
    Notification.countDocuments({ ...filter, archived: true }),
    Notification.aggregate([
      { $match: filter },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Notification.aggregate([
      { $match: filter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    Notification.aggregate([
      { $match: filter },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    Notification.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 90 },
    ]),
  ]);

  const readRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0;

  return {
    totalSent,
    totalRead,
    totalArchived,
    readRate,
    byCategory: byCategory.reduce((acc: any, c: any) => ({ ...acc, [c._id]: c.count }), {}),
    byType: byType.reduce((acc: any, t: any) => ({ ...acc, [t._id]: t.count }), {}),
    byPriority: byPriority.reduce((acc: any, p: any) => ({ ...acc, [p._id]: p.count }), {}),
    dailyCounts: dailyCounts.map((d: any) => ({ date: d._id, count: d.count })),
  };
}

function serializeNotification(doc: any) {
  return {
    id: doc._id?.toString() || doc.id,
    userId: doc.userId,
    orgId: doc.orgId,
    type: doc.type,
    category: doc.category,
    priority: doc.priority,
    title: doc.title,
    message: doc.message,
    icon: doc.icon,
    avatar: doc.avatar,
    read: doc.read,
    readAt: doc.readAt,
    archived: doc.archived,
    archivedAt: doc.archivedAt,
    snoozedUntil: doc.snoozedUntil,
    link: doc.link,
    deepLink: doc.deepLink,
    actions: doc.actions || [],
    channels: doc.channels || [],
    source: doc.source,
    correlationId: doc.correlationId,
    createdAt: doc.createdAt,
  };
}
