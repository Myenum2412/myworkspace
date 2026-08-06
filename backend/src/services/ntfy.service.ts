import { env } from "../config/env.js";
import { logger } from "../lib/logger/index.js";

let ntfyConfigured = false;

export function configureNtfy() {
  if (env.NTFY_BASE_URL) {
    ntfyConfigured = true;
    logger.info({ baseUrl: env.NTFY_BASE_URL }, "ntfy configured for push notifications");
  } else {
    logger.warn("NTFY_BASE_URL not set — push notifications disabled");
  }
}

export function isNtfyConfigured(): boolean {
  return env.NTFY_BASE_URL ? true : ntfyConfigured;
}

export function getNtfyConfig() {
  return {
    enabled: ntfyConfigured,
    baseUrl: env.NTFY_BASE_URL || "",
    topicPrefix: env.NTFY_TOPIC_PREFIX,
  };
}

export function getUserTopic(userId: string): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase() || "user";
  return `${env.NTFY_TOPIC_PREFIX}-${safeUserId}`;
}

function toPriority(priority?: string): number {
  switch (priority) {
    case "critical": return 5;
    case "high": return 4;
    case "normal": return 3;
    default: return 3;
  }
}

function toTags(tag?: string, type?: string): string[] {
  const tags: string[] = [];
  if (type) {
    const normalized = type.toLowerCase();
    if (normalized.includes("success") || normalized.includes("complete") || normalized.includes("approved")) tags.push("white_check_mark");
    else if (normalized.includes("fail") || normalized.includes("reject") || normalized.includes("error") || normalized.includes("denied")) tags.push("warning");
    else if (normalized.includes("task")) tags.push("clipboard");
    else if (normalized.includes("file") || normalized.includes("upload") || normalized.includes("share")) tags.push("page_facing_up");
    else if (normalized.includes("security") || normalized.includes("login") || normalized.includes("auth")) tags.push("lock");
    else if (normalized.includes("billing") || normalized.includes("payment") || normalized.includes("invoice")) tags.push("moneybag");
  }
  if (tag && tag !== "default") {
    tags.push(...tag.split(/[^a-zA-Z0-9_-]+/).filter(Boolean).map((t) => t.toLowerCase()));
  }
  return tags;
}

export async function publishToUser(
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
  if (!ntfyConfigured) return { success: false, reason: "ntfy not configured" };

  const topic = getUserTopic(userId);
  const url = `${env.NTFY_BASE_URL}/${topic}`;

  const body: Record<string, unknown> = {
    title: payload.title,
    message: payload.message || payload.title,
    priority: toPriority(payload.priority),
    tags: toTags(payload.tag, payload.type),
  };
  if (payload.link) body.click = payload.link;
  if (payload.icon) body.icon = payload.icon;
  if (payload.badge) body.icon = payload.badge;
  if (payload.actions?.length) {
    body.actions = payload.actions.map((a) => ({
      action: a.action,
      label: a.title,
      url: a.url || payload.link,
      clear: true,
    }));
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error({ userId, status: res.status, body: text }, "ntfy publish failed");
      return { success: false, status: res.status };
    }
    return { success: true, topic };
  } catch (err: any) {
    logger.error({ err: err.message, userId }, "ntfy publish error");
    return { success: false, error: err.message };
  }
}
