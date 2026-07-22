import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import crypto from "crypto";

// ── Token Encryption ─────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY environment variable is required");
  }
  return Buffer.from(keyHex, "hex");
}

function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512");
}

export function encryptToken(plaintext: string): string {
  const masterKey = getEncryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${salt.toString("hex")}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
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

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
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

// ── Types ────────────────────────────────────────────────────────────

export type CalendarEvent = {
  id: string;
  externalId?: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  provider: "google" | "microsoft";
  calendarEmail: string;
  calendarId?: string;
  htmlLink?: string;
  description?: string;
  location?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  attendees?: CalendarAttendee[];
  organizer?: { email: string; name?: string };
  conferenceData?: { type: string; uri: string };
  reminders?: { method: "email" | "popup"; minutes: number }[];
  color?: string;
  etag?: string;
  version?: number;
  lastModified?: string;
};

export type CalendarAttendee = {
  email: string;
  name?: string;
  status: "needsAction" | "declined" | "tentative" | "accepted";
  organizer: boolean;
};

export type CalendarConnection = {
  id: string;
  userId: string;
  orgId: string;
  provider: "google" | "microsoft";
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  calendarEmail: string;
  calendarName: string;
  syncEnabled: boolean;
  lastSyncAt: Date | null;
  syncToken?: string | null;
  scopes?: string[];
};

export type CalendarInfo = {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
  visibility?: string;
  primary?: boolean;
  selected?: boolean;
};

// ── Google Calendar ──────────────────────────────────────────────────

export async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
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
  } catch {
    return null;
  }
}

export async function getGoogleCalendarList(accessToken: string): Promise<CalendarInfo[]> {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.items || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    summary: (item.summary as string) || "Untitled Calendar",
    description: item.description as string | undefined,
    timeZone: item.timeZone as string | undefined,
    colorId: item.colorId as string | undefined,
    backgroundColor: item.backgroundColor as string | undefined,
    foregroundColor: item.foregroundColor as string | undefined,
    accessRole: item.accessRole as string | undefined,
    visibility: item.visibility as string | undefined,
    primary: item.primary as boolean | undefined,
    selected: item.selected as boolean | undefined,
  }));
}

export async function getGoogleCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  calendarId: string = "primary",
  syncToken?: string
): Promise<{ events: CalendarEvent[]; nextSyncToken?: string }> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  if (syncToken) {
    params.delete("timeMin");
    params.delete("timeMax");
    params.delete("singleEvents");
    params.delete("orderBy");
    params.set("syncToken", syncToken);
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return { events: [] };

  const data = await res.json();
  const events = (data.items || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    externalId: item.id as string,
    title: (item.summary as string) || "Untitled",
    start: (item.start as { dateTime?: string; date?: string })?.dateTime || (item.start as { date?: string })?.date || "",
    end: (item.end as { dateTime?: string; date?: string })?.dateTime || (item.end as { date?: string })?.date || "",
    allDay: !!(item.start as { date?: string })?.date,
    provider: "google" as const,
    calendarEmail: "",
    calendarId: calendarId,
    htmlLink: item.htmlLink as string,
    description: item.description as string | undefined,
    location: item.location as string | undefined,
    status: (item.status as "confirmed" | "tentative" | "cancelled") || "confirmed",
    attendees: ((item.attendees as Array<Record<string, unknown>>) || []).map((a) => ({
      email: a.email as string,
      name: a.displayName as string | undefined,
      status: (a.responseStatus as "needsAction" | "declined" | "tentative" | "accepted") || "needsAction",
      organizer: !!a.organizer,
    })),
    organizer: item.organizer as { email: string; name?: string } | undefined,
    conferenceData: item.conferenceData as { type: string; uri: string } | undefined,
    reminders: (item.reminders as { useDefault?: boolean; overrides?: Array<{ method: string; minutes: number }> })?.overrides?.map((r) => ({
      method: r.method as "email" | "popup",
      minutes: r.minutes,
    })),
    color: item.colorId as string | undefined,
    etag: item.etag as string,
    lastModified: (item.updated as string) || new Date().toISOString(),
  }));

  return {
    events,
    nextSyncToken: data.nextSyncToken,
  };
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent | null> {
  const body: Record<string, unknown> = {
    summary: event.title,
    description: event.description,
    location: event.location,
    status: event.status || "confirmed",
  };

  if (event.allDay) {
    body.start = { date: event.start };
    body.end = { date: event.end };
  } else {
    body.start = { dateTime: event.start, timeZone: "UTC" };
    body.end = { dateTime: event.end, timeZone: "UTC" };
  }

  if (event.attendees) {
    body.attendees = event.attendees.map((a) => ({
      email: a.email,
      displayName: a.name,
    }));
  }

  if (event.reminders) {
    body.reminders = {
      useDefault: false,
      overrides: event.reminders,
    };
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return {
    id: data.id,
    externalId: data.id,
    title: data.summary || "Untitled",
    start: data.start?.dateTime || data.start?.date || "",
    end: data.end?.dateTime || data.end?.date || "",
    allDay: !!data.start?.date,
    provider: "google",
    calendarEmail: "",
    calendarId,
    htmlLink: data.htmlLink,
    description: data.description,
    location: data.location,
    status: data.status,
    etag: data.etag,
    lastModified: data.updated,
  };
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent | null> {
  const body: Record<string, unknown> = {
    summary: event.title,
    description: event.description,
    location: event.location,
    status: event.status,
  };

  if (event.allDay !== undefined) {
    if (event.allDay) {
      body.start = { date: event.start };
      body.end = { date: event.end };
    } else {
      body.start = { dateTime: event.start, timeZone: "UTC" };
      body.end = { dateTime: event.end, timeZone: "UTC" };
    }
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return {
    id: data.id,
    externalId: data.id,
    title: data.summary || "Untitled",
    start: data.start?.dateTime || data.start?.date || "",
    end: data.end?.dateTime || data.end?.date || "",
    allDay: !!data.start?.date,
    provider: "google",
    calendarEmail: "",
    calendarId,
    htmlLink: data.htmlLink,
    description: data.description,
    location: data.location,
    status: data.status,
    etag: data.etag,
    lastModified: data.updated,
  };
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  return res.ok;
}

// ── Microsoft Outlook Calendar ───────────────────────────────────────

export async function refreshMicrosoftToken(refreshToken: string): Promise<string | null> {
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: "Calendars.Read Calendars.ReadWrite offline_access",
        }),
      }
    );
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

export async function getMicrosoftCalendarList(accessToken: string): Promise<CalendarInfo[]> {
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/calendars",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.value || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    summary: (item.name as string) || "Untitled Calendar",
    description: item.description as string | undefined,
    timeZone: item.timeZone as string | undefined,
    accessRole: "reader",
  }));
}

export async function getMicrosoftCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    startDateTime: timeMin,
    endDateTime: timeMax,
    $top: "100",
    $orderby: "start/dateTime",
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.value || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    externalId: item.id as string,
    title: (item.subject as string) || "Untitled",
    start: (item.start as { dateTime?: string })?.dateTime || "",
    end: (item.end as { dateTime?: string })?.dateTime || "",
    allDay: !!(item.isAllDay),
    provider: "microsoft" as const,
    calendarEmail: "",
    htmlLink: item.webLink as string,
    description: item.bodyPreview as string | undefined,
    location: (item.location as { displayName?: string })?.displayName,
    status: "confirmed" as const,
  }));
}

// ── Shared Functions ─────────────────────────────────────────────────

export async function getUserConnections(userId: string): Promise<CalendarConnection[]> {
  const docs = await db
    .collection(collections.calendarConnections)
    .find({ userId })
    .toArray();

  return docs.map((doc) => {
    // Decrypt tokens if encrypted
    let accessToken = doc.accessToken as string;
    let refreshToken = doc.refreshToken as string | null;

    try {
      if (isTokenEncrypted(accessToken)) {
        accessToken = decryptToken(accessToken);
      }
      if (refreshToken && isTokenEncrypted(refreshToken)) {
        refreshToken = decryptToken(refreshToken);
      }
    } catch (err) {
      console.error("[Calendar] Error decrypting tokens:", err);
    }

    return {
      id: (doc.id || doc._id?.toString()) as string,
      userId: doc.userId as string,
      orgId: doc.orgId as string,
      provider: doc.provider as "google" | "microsoft",
      accessToken,
      refreshToken,
      tokenExpiry: doc.tokenExpiry as Date | null,
      calendarEmail: doc.calendarEmail as string,
      calendarName: doc.calendarName as string,
      syncEnabled: doc.syncEnabled as boolean,
      lastSyncAt: doc.lastSyncAt as Date | null,
      syncToken: doc.syncToken as string | null,
      scopes: doc.scopes as string[] | undefined,
    };
  });
}

export async function getUserConnection(userId: string, connectionId: string): Promise<CalendarConnection | null> {
  const docs = await getUserConnections(userId);
  return docs.find((c) => c.id === connectionId) || null;
}

export async function getCalendarList(userId: string): Promise<CalendarInfo[]> {
  const connections = await getUserConnections(userId);
  const calendars: CalendarInfo[] = [];

  for (const conn of connections) {
    if (!conn.syncEnabled) continue;

    try {
      if (conn.provider === "google") {
        const calList = await getGoogleCalendarList(conn.accessToken);
        calendars.push(...calList);
      } else {
        const calList = await getMicrosoftCalendarList(conn.accessToken);
        calendars.push(...calList);
      }
    } catch (err) {
      console.error(`[Calendar] Error fetching ${conn.provider} calendar list:`, err);
    }
  }

  return calendars;
}

export async function getCalendarEvents(
  userId: string,
  timeMin: string,
  timeMax: string,
  calendarId?: string
): Promise<CalendarEvent[]> {
  const connections = await getUserConnections(userId);
  const events: CalendarEvent[] = [];

  for (const conn of connections) {
    if (!conn.syncEnabled) continue;

    let accessToken = conn.accessToken;

    // Refresh token if expired
    if (conn.tokenExpiry && new Date(conn.tokenExpiry) < new Date()) {
      if (conn.refreshToken) {
        let newToken: string | null = null;
        if (conn.provider === "google") {
          newToken = await refreshGoogleToken(conn.refreshToken);
        } else {
          newToken = await refreshMicrosoftToken(conn.refreshToken);
        }
        if (newToken) {
          accessToken = newToken;
          // Store encrypted token
          const encryptedToken = encryptToken(newToken);
          await db.collection(collections.calendarConnections).updateOne(
            { id: conn.id },
            { $set: { accessToken: encryptedToken, updatedAt: new Date() } }
          );
        } else {
          continue; // Token refresh failed, skip this connection
        }
      } else {
        continue; // No refresh token, skip
      }
    }

    try {
      let providerEvents: CalendarEvent[] = [];
      if (conn.provider === "google") {
        const calId = calendarId || "primary";
        const result = await getGoogleCalendarEvents(accessToken, timeMin, timeMax, calId);
        providerEvents = result.events;
      } else {
        providerEvents = await getMicrosoftCalendarEvents(accessToken, timeMin, timeMax);
      }

      // Tag events with calendar email
      providerEvents.forEach((e) => {
        e.calendarEmail = conn.calendarEmail;
      });

      events.push(...providerEvents);

      // Update lastSyncAt
      await db.collection(collections.calendarConnections).updateOne(
        { id: conn.id },
        { $set: { lastSyncAt: new Date() } }
      );
    } catch (err) {
      console.error(`[Calendar] Error fetching ${conn.provider} events:`, err);
    }
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export async function createCalendarEvent(
  userId: string,
  connectionId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent | null> {
  const conn = await getUserConnection(userId, connectionId);
  if (!conn) return null;

  let accessToken = conn.accessToken;

  // Refresh token if needed
  if (conn.tokenExpiry && new Date(conn.tokenExpiry) < new Date()) {
    if (conn.refreshToken) {
      let newToken: string | null = null;
      if (conn.provider === "google") {
        newToken = await refreshGoogleToken(conn.refreshToken);
      } else {
        newToken = await refreshMicrosoftToken(conn.refreshToken);
      }
      if (newToken) {
        accessToken = newToken;
        const encryptedToken = encryptToken(newToken);
        await db.collection(collections.calendarConnections).updateOne(
          { id: conn.id },
          { $set: { accessToken: encryptedToken, updatedAt: new Date() } }
        );
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  if (conn.provider === "google") {
    const calendarId = event.calendarId || "primary";
    const created = await createGoogleCalendarEvent(accessToken, calendarId, event);
    if (created) {
      created.calendarEmail = conn.calendarEmail;
    }
    return created;
  }

  return null;
}

export async function updateCalendarEvent(
  userId: string,
  connectionId: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent | null> {
  const conn = await getUserConnection(userId, connectionId);
  if (!conn) return null;

  let accessToken = conn.accessToken;

  // Refresh token if needed
  if (conn.tokenExpiry && new Date(conn.tokenExpiry) < new Date()) {
    if (conn.refreshToken) {
      let newToken: string | null = null;
      if (conn.provider === "google") {
        newToken = await refreshGoogleToken(conn.refreshToken);
      } else {
        newToken = await refreshMicrosoftToken(conn.refreshToken);
      }
      if (newToken) {
        accessToken = newToken;
        const encryptedToken = encryptToken(newToken);
        await db.collection(collections.calendarConnections).updateOne(
          { id: conn.id },
          { $set: { accessToken: encryptedToken, updatedAt: new Date() } }
        );
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  if (conn.provider === "google") {
    const calendarId = event.calendarId || "primary";
    const updated = await updateGoogleCalendarEvent(accessToken, calendarId, eventId, event);
    if (updated) {
      updated.calendarEmail = conn.calendarEmail;
    }
    return updated;
  }

  return null;
}

export async function deleteCalendarEvent(
  userId: string,
  connectionId: string,
  eventId: string,
  calendarId: string = "primary"
): Promise<boolean> {
  const conn = await getUserConnection(userId, connectionId);
  if (!conn) return false;

  let accessToken = conn.accessToken;

  // Refresh token if needed
  if (conn.tokenExpiry && new Date(conn.tokenExpiry) < new Date()) {
    if (conn.refreshToken) {
      let newToken: string | null = null;
      if (conn.provider === "google") {
        newToken = await refreshGoogleToken(conn.refreshToken);
      } else {
        newToken = await refreshMicrosoftToken(conn.refreshToken);
      }
      if (newToken) {
        accessToken = newToken;
        const encryptedToken = encryptToken(newToken);
        await db.collection(collections.calendarConnections).updateOne(
          { id: conn.id },
          { $set: { accessToken: encryptedToken, updatedAt: new Date() } }
        );
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  if (conn.provider === "google") {
    return deleteGoogleCalendarEvent(accessToken, calendarId, eventId);
  }

  return false;
}

export async function syncCalendarEvents(
  userId: string,
  connectionId: string
): Promise<{ synced: number; errors: number }> {
  const conn = await getUserConnection(userId, connectionId);
  if (!conn) return { synced: 0, errors: 1 };

  let accessToken = conn.accessToken;

  // Refresh token if needed
  if (conn.tokenExpiry && new Date(conn.tokenExpiry) < new Date()) {
    if (conn.refreshToken) {
      let newToken: string | null = null;
      if (conn.provider === "google") {
        newToken = await refreshGoogleToken(conn.refreshToken);
      } else {
        newToken = await refreshMicrosoftToken(conn.refreshToken);
      }
      if (newToken) {
        accessToken = newToken;
        const encryptedToken = encryptToken(newToken);
        await db.collection(collections.calendarConnections).updateOne(
          { id: conn.id },
          { $set: { accessToken: encryptedToken, updatedAt: new Date() } }
        );
      } else {
        return { synced: 0, errors: 1 };
      }
    } else {
      return { synced: 0, errors: 1 };
    }
  }

  if (conn.provider === "google") {
    // Use sync token for incremental sync
    const syncToken = conn.syncToken;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const result = await getGoogleCalendarEvents(
      accessToken,
      oneWeekAgo.toISOString(),
      oneWeekLater.toISOString(),
      "primary",
      syncToken || undefined
    );

    // Store events in database
    let synced = 0;
    let errors = 0;

    for (const event of result.events) {
      try {
        await db.collection(collections.calendarEvents).updateOne(
          { userId, externalId: event.id },
          {
            $set: {
              userId,
              orgId: conn.orgId,
              connectionId,
              externalId: event.id,
              calendarId: event.calendarId || "primary",
              title: event.title,
              description: event.description || null,
              location: event.location || null,
              start: new Date(event.start),
              end: new Date(event.end),
              allDay: event.allDay,
              timezone: "UTC",
              status: event.status || "confirmed",
              visibility: "default",
              attendees: event.attendees || [],
              organizer: event.organizer || { email: conn.calendarEmail },
              conferenceData: event.conferenceData || null,
              reminders: event.reminders || [],
              color: event.color || null,
              etag: event.etag || "",
              version: 1,
              lastModified: new Date(event.lastModified || Date.now()),
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
        synced++;
      } catch (err) {
        console.error("[Calendar] Error syncing event:", err);
        errors++;
      }
    }

    // Update sync token
    if (result.nextSyncToken) {
      await db.collection(collections.calendarConnections).updateOne(
        { id: conn.id },
        {
          $set: {
            syncToken: result.nextSyncToken,
            lastSyncAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
    }

    return { synced, errors };
  }

  return { synced: 0, errors: 0 };
}
