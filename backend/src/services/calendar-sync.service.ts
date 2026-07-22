import { mongoose } from "../lib/db/index.js";
import { collections } from "../lib/db/collections.js";

const db = mongoose.connection.db!;
import { logger } from "../lib/logger/index.js";
import crypto from "crypto";

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

interface SyncResult {
  synced: number;
  updated: number;
  deleted: number;
  errors: number;
}

// ── Token Management ─────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const keyHex = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY environment variable is required");
  }
  return Buffer.from(keyHex, "hex");
}

function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, "sha512");
}

export function decryptToken(encryptedData: string): string {
  const masterKey = getEncryptionKey();
  const parts = encryptedData.split(":");

  if (parts.length !== 4) {
    throw new Error("Invalid encrypted token format");
  }

  const [saltHex, ivHex, authTagHex, encrypted] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const key = deriveKey(masterKey, salt);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: 16,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function isTokenEncrypted(data: string): boolean {
  const parts = data.split(":");
  return parts.length === 4 && parts.every((p) => /^[0-9a-f]+$/.test(p));
}

function getDecryptedToken(token: string): string {
  if (isTokenEncrypted(token)) {
    return decryptToken(token);
  }
  return token;
}

// ── Token Refresh ────────────────────────────────────────────────────

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    return data.access_token || null;
  } catch (err: any) {
    logger.error("Failed to refresh Google token:", err);
    return null;
  }
}

async function ensureValidToken(connection: CalendarConnection): Promise<string | null> {
  let accessToken = getDecryptedToken(connection.accessToken);

  // Check if token is expired
  if (new Date(connection.tokenExpiry) < new Date()) {
    if (connection.refreshToken) {
      const refreshToken = getDecryptedToken(connection.refreshToken);
      const newToken = await refreshGoogleToken(refreshToken);
      if (newToken) {
        // Store encrypted token
        const { encryptToken } = await import("../lib/security/token-encryption.js");
        const encryptedToken = encryptToken(newToken);
        await db.collection(collections.calendarConnections).updateOne(
          { id: connection.id },
          { $set: { accessToken: encryptedToken, updatedAt: new Date() } }
        );
        return newToken;
      }
      return null;
    }
    return null;
  }

  return accessToken;
}

// ── Google Calendar API ──────────────────────────────────────────────

async function getGoogleCalendarList(accessToken: string) {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

async function getGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  syncToken?: string
) {
  const params = new URLSearchParams({
    maxResults: "250",
  });

  if (syncToken) {
    params.set("syncToken", syncToken);
  } else {
    // Initial sync: get events from past week to next week
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    params.set("timeMin", oneWeekAgo.toISOString());
    params.set("timeMax", oneWeekLater.toISOString());
    params.set("singleEvents", "true");
    params.set("orderBy", "startTime");
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const error = await res.json();
    // 410 Gone means sync token is expired, need full sync
    if (res.status === 410) {
      return { items: [], nextSyncToken: null, resetSync: true };
    }
    throw new Error(`Google API error: ${error.error?.message || res.statusText}`);
  }

  return res.json();
}

async function watchGoogleCalendar(
  accessToken: string,
  calendarId: string,
  webhookUrl: string,
  channelId: string
) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
        token: process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET,
        expiration: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      }),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Failed to watch calendar: ${error.error?.message || res.statusText}`);
  }

  return res.json();
}

// ── Sync Operations ──────────────────────────────────────────────────

export async function syncUserCalendars(userId: string): Promise<SyncResult> {
  const connections = await db
    .collection(collections.calendarConnections)
    .find({ userId, syncEnabled: true })
    .toArray();

  const result: SyncResult = { synced: 0, updated: 0, deleted: 0, errors: 0 };

  for (const conn of connections) {
    try {
      const connection = conn as unknown as CalendarConnection;
      const accessToken = await ensureValidToken(connection);
      if (!accessToken) {
        result.errors++;
        continue;
      }

      if (connection.provider === "google") {
        const googleResult = await syncGoogleCalendar(connection, accessToken);
        result.synced += googleResult.synced;
        result.updated += googleResult.updated;
        result.deleted += googleResult.deleted;
      }
    } catch (err: any) {
      logger.error(`Error syncing calendar for user ${userId}:`, err);
      result.errors++;
    }
  }

  return result;
}

async function syncGoogleCalendar(
  connection: CalendarConnection,
  accessToken: string
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, updated: 0, deleted: 0, errors: 0 };

  // Get calendar list
  const calendars = await getGoogleCalendarList(accessToken);

  for (const cal of calendars) {
    if (!cal.selected) continue;

    try {
      const calResult = await syncGoogleCalendarEvents(
        connection,
        accessToken,
        cal.id,
        connection.syncToken
      );
      result.synced += calResult.synced;
      result.updated += calResult.updated;
      result.deleted += calResult.deleted;

      // Update sync token
      if (calResult.nextSyncToken) {
        await db.collection(collections.calendarConnections).updateOne(
          { id: connection.id },
          { $set: { syncToken: calResult.nextSyncToken, lastSyncAt: new Date() } }
        );
      }
    } catch (err: any) {
      logger.error(`Error syncing calendar ${cal.id}:`, err);
      result.errors++;
    }
  }

  return result;
}

async function syncGoogleCalendarEvents(
  connection: CalendarConnection,
  accessToken: string,
  calendarId: string,
  syncToken: string | null
): Promise<SyncResult & { nextSyncToken?: string }> {
  const result: SyncResult & { nextSyncToken?: string } = {
    synced: 0,
    updated: 0,
    deleted: 0,
    errors: 0,
  };

  const data = await getGoogleCalendarEvents(accessToken, calendarId, syncToken || undefined);

  // Handle sync token reset (full sync needed)
  if (data.resetSync) {
    logger.info(`Sync token expired for calendar ${calendarId}, performing full sync`);
    const fullData = await getGoogleCalendarEvents(accessToken, calendarId);
    return syncGoogleCalendarEvents(connection, accessToken, calendarId, null);
  }

  // Process events
  for (const event of data.items || []) {
    try {
      if (event.status === "cancelled") {
        // Event was deleted
        await db.collection(collections.calendarEvents).deleteOne({
          userId: connection.userId,
          externalId: event.id,
        });
        result.deleted++;
      } else {
        // Event was created or updated
        const existing = await db.collection(collections.calendarEvents).findOne({
          userId: connection.userId,
          externalId: event.id,
        });

        const eventData = {
          userId: connection.userId,
          orgId: connection.orgId,
          connectionId: connection.id,
          externalId: event.id,
          calendarId,
          title: event.summary || "Untitled",
          description: event.description || null,
          location: event.location || null,
          start: new Date(event.start?.dateTime || event.start?.date),
          end: new Date(event.end?.dateTime || event.end?.date),
          allDay: !!event.start?.date,
          timezone: event.start?.timeZone || "UTC",
          status: event.status || "confirmed",
          visibility: event.visibility || "default",
          recurrence: event.recurrence || null,
          attendees: (event.attendees || []).map((a: any) => ({
            email: a.email,
            name: a.displayName || null,
            status: a.responseStatus || "needsAction",
            organizer: !!a.organizer,
          })),
          organizer: event.organizer || { email: connection.calendarEmail },
          conferenceData: event.conferenceData ? {
            type: event.conferenceData.conferenceSolution?.name || "Google Meet",
            uri: event.conferenceData.entryPoints?.[0]?.uri || "",
          } : null,
          reminders: event.reminders?.overrides?.map((r: any) => ({
            method: r.method,
            minutes: r.minutes,
          })) || [],
          color: event.colorId || null,
          etag: event.etag || "",
          version: existing ? (existing.version || 0) + 1 : 1,
          lastModified: new Date(event.updated),
          updatedAt: new Date(),
        };

        if (existing) {
          await db.collection(collections.calendarEvents).updateOne(
            { _id: existing._id },
            { $set: eventData }
          );
          result.updated++;
        } else {
          await db.collection(collections.calendarEvents).insertOne({
            ...eventData,
            createdAt: new Date(),
          });
          result.synced++;
        }
      }
    } catch (err: any) {
      logger.error(`Error processing event ${event.id}:`, err);
      result.errors++;
    }
  }

  return {
    ...result,
    nextSyncToken: data.nextSyncToken,
  };
}

// ── Webhook Management ───────────────────────────────────────────────

export async function setupCalendarWebhook(
  connectionId: string,
  calendarId: string
): Promise<boolean> {
  const connection = await db
    .collection(collections.calendarConnections)
    .findOne({ id: connectionId });

  if (!connection) return false;

  const conn = connection as unknown as CalendarConnection;
  const accessToken = await ensureValidToken(conn);
  if (!accessToken) return false;

  const webhookUrl = process.env.GOOGLE_CALENDAR_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.error("GOOGLE_CALENDAR_WEBHOOK_URL not configured");
    return false;
  }

  const channelId = `calendar-${connectionId}-${Date.now()}`;

  try {
    const result = await watchGoogleCalendar(
      accessToken,
      calendarId,
      webhookUrl,
      channelId
    );

    // Store webhook info
    await db.collection(collections.calendarConnections).updateOne(
      { id: connectionId },
      {
        $set: {
          webhookChannelId: channelId,
          webhookExpiration: new Date(result.expiration),
          updatedAt: new Date(),
        },
      }
    );

    logger.info(`Webhook set up for calendar ${calendarId}, channel ${channelId}`);
    return true;
  } catch (err: any) {
    logger.error("Failed to set up webhook:", err);
    return false;
  }
}

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
    } catch (err: any) {
      logger.error(`Failed to renew webhook for connection ${conn.id}:`, err);
    }
  }

  return renewed;
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
    logger.warn("Invalid webhook token");
    return false;
  }

  logger.info(`Received webhook: channel=${channelId}, state=${resourceState}`);

  // Only sync on sync/exists events
  if (resourceState !== "sync" && resourceState !== "exists") {
    return true;
  }

  // Find connection by channel ID
  const connection = await db
    .collection(collections.calendarConnections)
    .findOne({ webhookChannelId: channelId });

  if (!connection) {
    logger.warn(`No connection found for channel ${channelId}`);
    return false;
  }

  // Trigger sync for this user
  const result = await syncUserCalendars(connection.userId);
  logger.info(`Webhook sync completed: ${JSON.stringify(result)}`);

  return true;
}

// ── Scheduled Jobs ───────────────────────────────────────────────────

export async function runScheduledSync(): Promise<void> {
  logger.info("Starting scheduled calendar sync");

  const connections = await db
    .collection(collections.calendarConnections)
    .find({ syncEnabled: true })
    .toArray();

  const uniqueUserIds = [...new Set(connections.map((c: any) => c.userId))];

  for (const userId of uniqueUserIds) {
    try {
      await syncUserCalendars(userId as string);
    } catch (err: any) {
      logger.error(`Scheduled sync failed for user ${userId}:`, err);
    }
  }

  logger.info(`Scheduled sync completed for ${uniqueUserIds.length} users`);
}
