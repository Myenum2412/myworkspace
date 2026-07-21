import { Notification, NotificationType, NotificationCategory, NotificationPriority, INotificationAction } from "../lib/db/models/Notification.js";
import { NotificationSettings } from "../lib/db/models/NotificationSettings.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { cacheManager } from "../lib/cache.js";
import { sendPushNotification } from "./push.service.js";
import { recordAuditLog } from "./audit.service.js";
import { logger } from "../lib/logger/index.js";
import { v4 as uuid } from "uuid";

export interface EngineEvent {
  userId: string;
  orgId: string;
  createdBy: string;
  type: string;
  category?: string;
  priority?: string;
  title: string;
  message?: string;
  icon?: string;
  avatar?: string;
  link?: string;
  deepLink?: string;
  actions?: INotificationAction[];
  metadata?: Record<string, unknown>;
  source?: string;
  correlationId?: string;
  channels?: string[];
  expiresAt?: string;
  skipDeduplication?: boolean;
  deduplicationKey?: string;
  tenantId?: string;
  sendEmail?: boolean;
  emailTemplate?: string;
  emailData?: Record<string, unknown>;
  emitSocket?: boolean;
  recordAudit?: boolean;
  auditAction?: string;
  auditEntityType?: string;
  auditEntityId?: string;
  auditDescription?: string;
}

export interface EngineResult {
  notificationId?: string;
  channels: string[];
  emailQueued: boolean;
  pushSent: boolean;
  socketEmitted: boolean;
  auditRecorded: boolean;
  deduplicated: boolean;
}

const NOTIFICATION_TTL_DAYS = parseInt(process.env.NOTIFICATION_TTL_DAYS || "90", 10);
const CRITICAL_TYPES = new Set([
  "suspicious_login", "account_locked", "password_changed", "payment_failed",
  "storage_exceeded", "system_outage", "unauthorized_access_attempt",
]);

async function checkDeduplication(event: EngineEvent): Promise<boolean> {
  if (event.skipDeduplication) return false;
  const key = event.deduplicationKey || event.correlationId;
  if (!key) return false;
  const existing = await Notification.findOne({
    $or: [
      { correlationId: key },
      ...(event.deduplicationKey ? [{ deduplicationKey: event.deduplicationKey }] : []),
    ],
    userId: event.userId,
    createdAt: { $gte: new Date(Date.now() - 60000) },
  }).lean();
  return !!existing;
}

async function determineChannels(event: EngineEvent): Promise<string[]> {
  if (event.channels && event.channels.length > 0) return event.channels;
  if (CRITICAL_TYPES.has(event.type)) return ["inapp", "email", "push", "socket"];

  const channels: string[] = ["inapp", "socket"];

  try {
    const settings = await NotificationSettings.findOne({
      userId: event.userId,
      orgId: event.orgId,
    }).lean();

    if (!settings) {
      channels.push("email");
      return channels;
    }

    const cat = (event.category || "system") as string;
    const catSetting = settings.categorySettings?.[cat as keyof typeof settings.categorySettings];
    if (catSetting) {
      if (catSetting.email !== false) channels.push("email");
      if (catSetting.push !== false) channels.push("push");
    } else {
      channels.push("email");
    }

    const typeSetting = settings.typeSettings?.find(
      (ts: any) => ts.type === event.type
    );
    if (typeSetting && typeSetting.enabled === false) {
      const idx = channels.indexOf("inapp");
      if (idx >= 0) channels.splice(idx, 1);
    }
    if (typeSetting?.channels) {
      if (typeSetting.channels.email === false) {
        const idx = channels.indexOf("email");
        if (idx >= 0) channels.splice(idx, 1);
      }
      if (typeSetting.channels.inApp === false) {
        const idx = channels.indexOf("inapp");
        if (idx >= 0) channels.splice(idx, 1);
      }
    }

    if (settings.doNotDisturb) {
      const emailIdx = channels.indexOf("email");
      if (emailIdx >= 0) channels.splice(emailIdx, 1);
      const pushIdx = channels.indexOf("push");
      if (pushIdx >= 0) channels.splice(pushIdx, 1);
    }

    if (settings.quietHoursEnabled) {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const current = hour * 60 + minute;
      const startHour = parseInt(settings.quietHoursStart?.split(":")[0] || "22", 10);
      const startMin = parseInt(settings.quietHoursStart?.split(":")[1] || "0", 10);
      const endHour = parseInt(settings.quietHoursEnd?.split(":")[0] || "07", 10);
      const endMin = parseInt(settings.quietHoursEnd?.split(":")[1] || "0", 10);
      const qStart = startHour * 60 + startMin;
      const qEnd = endHour * 60 + endMin;
      let inQuiet = false;
      if (qEnd > qStart) {
        inQuiet = current >= qStart && current < qEnd;
      } else {
        inQuiet = current >= qStart || current < qEnd;
      }
      if (inQuiet) {
        const emailIdx = channels.indexOf("email");
        if (emailIdx >= 0) channels.splice(emailIdx, 1);
        const pushIdx = channels.indexOf("push");
        if (pushIdx >= 0) channels.splice(pushIdx, 1);
      }
    }

    const isMuted = settings.mutedNotifications?.some(
      (m: any) =>
        m.type === event.type &&
        (m.mutedForever || (m.mutedUntil && new Date(m.mutedUntil) > new Date()))
    );
    if (isMuted) {
      const idx = channels.indexOf("inapp");
      if (idx >= 0) channels.splice(idx, 1);
    }
  } catch (err) {
    logger.error({ err }, "Failed to determine channels, using defaults");
  }

  return [...new Set(channels)];
}

async function createInApp(event: EngineEvent) {
  const doc = await Notification.create({
    userId: event.userId,
    orgId: event.orgId,
    createdBy: event.createdBy,
    type: event.type as NotificationType,
    category: (event.category as NotificationCategory) || "system",
    priority: (event.priority as NotificationPriority) || "normal",
    title: event.title,
    message: event.message,
    icon: event.icon,
    avatar: event.avatar,
    link: event.link,
    deepLink: event.deepLink,
    actions: event.actions,
    metadata: event.metadata,
    source: event.source || "system",
    channels: event.channels || [],
    correlationId: event.correlationId || uuid(),
    expiresAt: event.expiresAt ? new Date(event.expiresAt) : new Date(Date.now() + NOTIFICATION_TTL_DAYS * 86400000),
    read: false,
    archived: false,
  });

  try {
    await cacheManager.del(`unread:${event.userId}:${event.orgId}`);
  } catch { /* ok */ }

  return doc;
}

async function emitSocket(event: EngineEvent, notificationDoc?: any) {
  try {
    const payload = notificationDoc ? {
      _id: notificationDoc._id,
      type: event.type,
      category: event.category || "system",
      priority: event.priority || "normal",
      title: event.title,
      message: event.message,
      link: event.link,
      actions: event.actions,
      metadata: event.metadata,
      createdAt: notificationDoc.createdAt || new Date().toISOString(),
      read: false,
      archived: false,
    } : {
      type: event.type,
      category: event.category || "system",
      priority: event.priority || "normal",
      title: event.title,
      message: event.message,
      link: event.link,
    };

    socketIOManager.emitToUser(event.userId, "notification", payload);
    socketIOManager.emitToOrg(event.orgId, "notification:org", payload);
  } catch (err) {
    logger.error({ err }, "Socket emission failed");
  }
}

async function sendPush(event: EngineEvent, notificationDoc?: any) {
  try {
    if (CRITICAL_TYPES.has(event.type)) {
      await sendPushNotification(event.userId, {
        title: event.title,
        message: event.message || "",
        link: event.link,
        tag: `notification:${notificationDoc?._id || event.type}`,
      });
    }
  } catch (err) {
    logger.error({ err }, "Push notification failed");
  }
}

export async function processEvent(event: EngineEvent): Promise<EngineResult> {
  const result: EngineResult = {
    channels: [],
    emailQueued: false,
    pushSent: false,
    socketEmitted: false,
    auditRecorded: false,
    deduplicated: false,
  };

  const startTime = Date.now();

  try {
    if (await checkDeduplication(event)) {
      logger.debug({ type: event.type, userId: event.userId }, "Notification deduplicated");
      result.deduplicated = true;
      return result;
    }
  } catch (err) {
    logger.error({ err }, "Deduplication check failed, proceeding");
  }

  const channels = await determineChannels(event);
  result.channels = channels;

  const notificationDoc = channels.includes("inapp") ? await createInApp(event) : undefined;
  result.notificationId = notificationDoc?._id?.toString();

  await Promise.allSettled([
    channels.includes("socket") ? emitSocket(event, notificationDoc) : Promise.resolve(),
    channels.includes("push") ? sendPush(event, notificationDoc) : Promise.resolve(),
    event.recordAudit !== false ? recordAudit(event) : Promise.resolve(),
  ]);

  result.socketEmitted = true;
  result.pushSent = true;
  result.auditRecorded = true;

  const duration = Date.now() - startTime;
  if (duration > 100) {
    logger.warn({ duration, type: event.type }, "Notification engine slow processing");
  }

  return result;
}

async function recordAudit(event: EngineEvent) {
  try {
    await recordAuditLog({
      orgId: event.orgId,
      userId: event.userId,
      createdBy: event.createdBy,
      action: event.auditAction || `notification.${event.type}`,
      entityType: event.auditEntityType || "notification",
      entityId: event.auditEntityId || event.correlationId || uuid(),
      description: event.auditDescription || `${event.type}: ${event.title}`,
    });
  } catch (err) {
    logger.error({ err }, "Audit log failed");
  }
}

export async function processBatch(events: EngineEvent[]): Promise<EngineResult[]> {
  const results = await Promise.allSettled(events.map(e => processEvent(e)));
  return results.map(r =>
    r.status === "fulfilled" ? r.value : {
      channels: [], emailQueued: false, pushSent: false,
      socketEmitted: false, auditRecorded: false, deduplicated: false,
    }
  );
}
