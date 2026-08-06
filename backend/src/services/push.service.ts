import { env } from "../config/env.js";
import { PushSubscription } from "../lib/db/models/PushSubscription.js";
import { logger } from "../lib/logger/index.js";
import { configureNtfy, isNtfyConfigured, publishToUser } from "./ntfy.service.js";

export function configureVapid() {
  configureNtfy();
}

export function getVapidPublicKey(): string | null {
  return null;
}

export function getPushConfig() {
  return {
    provider: "ntfy",
    enabled: isNtfyConfigured(),
    baseUrl: env.NTFY_BASE_URL || "",
  };
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
    priority?: string;
    type?: string;
  }
) {
  if (!isNtfyConfigured()) return { success: false, reason: "ntfy not configured" };
  return publishToUser(userId, payload);
}