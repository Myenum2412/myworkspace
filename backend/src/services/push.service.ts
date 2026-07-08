import webpush from "web-push";
import { env } from "../config/env.js";
import { PushSubscription } from "../lib/db/models/PushSubscription.js";
import { logger } from "../lib/logger/index.js";

let vapidConfigured = false;

export function configureVapid() {
  if (vapidConfigured) return;
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
    logger.info("VAPID configured for web push");
  } else {
    logger.warn("VAPID keys not set — push notifications disabled");
  }
}

export function getVapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY || null;
}

export async function subscribeUser(
  userId: string,
  orgId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
) {
  await PushSubscription.findOneAndUpdate(
    { userId, endpoint: subscription.endpoint },
    {
      userId,
      orgId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent,
      enabled: true,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

export async function unsubscribeUser(userId: string, endpoint: string) {
  await PushSubscription.findOneAndUpdate(
    { userId, endpoint },
    { enabled: false }
  );
}

export async function getUserSubscriptions(userId: string) {
  return PushSubscription.find({ userId, enabled: true });
}

export async function sendPushNotification(
  userId: string,
  payload: {
    title: string;
    message?: string;
    icon?: string;
    badge?: string;
    link?: string;
    actions?: Array<{ action: string; title: string; url?: string }>;
    tag?: string;
  }
) {
  if (!vapidConfigured) return { success: false, reason: "VAPID not configured" };

  const subs = await getUserSubscriptions(userId);
  if (subs.length === 0) return { success: true, sent: 0 };

  const results = { success: true, sent: 0, failed: 0 };

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.message,
          icon: payload.icon || "/web-app-manifest-192x192.png",
          badge: payload.badge || "/web-app-manifest-192x192.png",
          data: {
            link: payload.link,
            url: payload.link,
            actions: payload.actions,
          },
          actions: payload.actions,
          tag: payload.tag || "default",
          vibrate: [200, 100, 200],
        })
      );
      results.sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await PushSubscription.findByIdAndDelete(sub._id);
        logger.warn({ userId, endpoint: sub.endpoint }, "Push subscription expired — removed");
      } else {
        logger.error({ err: err.message, userId }, "Push notification send failed");
      }
      results.failed++;
    }
  }

  return results;
}
