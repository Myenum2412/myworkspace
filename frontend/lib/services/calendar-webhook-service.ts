import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

// ── Types ────────────────────────────────────────────────────────────

interface CalendarConnection {
  id: string;
  userId: string;
  orgId: string;
  provider: "google" | "microsoft";
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: Date;
  calendarEmail: string;
  syncEnabled: boolean;
  syncToken: string | null;
  webhookChannelId: string | null;
  webhookExpiration: Date | null;
}

// ── Webhook Handler ──────────────────────────────────────────────────

export async function handleCalendarWebhook(
  headers: Record<string, string>
): Promise<boolean> {
  const channelId = headers["x-goog-channel-id"];
  const resourceState = headers["x-goog-resource-state"];
  const resourceId = headers["x-goog-resource-id"];
  const channelToken = headers["x-goog-channel-token"];

  // Verify webhook secret
  if (channelToken !== process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET) {
    console.warn("[Calendar Webhook] Invalid webhook token");
    return false;
  }

  console.log(`[Calendar Webhook] Received: channel=${channelId}, state=${resourceState}`);

  // Only sync on sync/exists events
  if (resourceState !== "sync" && resourceState !== "exists") {
    return true;
  }

  // Find connection by channel ID
  const connection = await db
    .collection(collections.calendarConnections)
    .findOne({ webhookChannelId: channelId });

  if (!connection) {
    console.warn(`[Calendar Webhook] No connection found for channel ${channelId}`);
    return false;
  }

  // Trigger sync for this user (simplified version)
  const userId = connection.userId;
  console.log(`[Calendar Webhook] Triggering sync for user ${userId}`);

  // In a production environment, this would trigger a background job
  // For now, we'll just log it
  return true;
}

// ── Webhook Setup ────────────────────────────────────────────────────

export async function setupCalendarWebhook(
  connectionId: string,
  calendarId: string
): Promise<boolean> {
  const connection = await db
    .collection(collections.calendarConnections)
    .findOne({ id: connectionId });

  if (!connection) return false;

  const conn = connection as unknown as CalendarConnection;
  
  // For now, just log the webhook setup request
  console.log(`[Calendar Webhook] Setup requested for connection ${connectionId}, calendar ${calendarId}`);
  
  // In production, this would call the Google Calendar Watch API
  // and store the channel ID and expiration
  
  return true;
}

// ── Webhook Renewal ──────────────────────────────────────────────────

export async function renewExpiringWebhooks(): Promise<number> {
  const threshold = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days

  const expiringConnections = await db
    .collection(collections.calendarConnections)
    .find({
      syncEnabled: true,
      webhookChannelId: { $exists: true, $ne: null },
      webhookExpiration: { $lt: threshold },
    })
    .toArray();

  let renewed = 0;

  for (const conn of expiringConnections) {
    try {
      const connection = conn as unknown as CalendarConnection;
      const success = await setupCalendarWebhook(connection.id, "primary");
      if (success) renewed++;
    } catch (err) {
      console.error(`[Calendar Webhook] Failed to renew webhook for connection ${conn.id}:`, err);
    }
  }

  return renewed;
}
