import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  provider: "google" | "microsoft";
  calendarEmail: string;
  htmlLink?: string;
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

export async function getGoogleCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.items || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    title: (item.summary as string) || "Untitled",
    start: (item.start as { dateTime?: string; date?: string })?.dateTime || (item.start as { date?: string })?.date || "",
    end: (item.end as { dateTime?: string; date?: string })?.dateTime || (item.end as { date?: string })?.date || "",
    allDay: !!(item.start as { date?: string })?.date,
    provider: "google" as const,
    calendarEmail: "",
    htmlLink: item.htmlLink as string,
  }));
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
          scope: "Calendars.Read offline_access",
        }),
      }
    );
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
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
    title: (item.subject as string) || "Untitled",
    start: (item.start as { dateTime?: string })?.dateTime || "",
    end: (item.end as { dateTime?: string })?.dateTime || "",
    allDay: !!(item.isAllDay),
    provider: "microsoft" as const,
    calendarEmail: "",
    webLink: item.webLink as string,
  }));
}

// ── Shared ───────────────────────────────────────────────────────────

export async function getUserConnections(userId: string): Promise<CalendarConnection[]> {
  const docs = await db
    .collection(collections.calendarConnections)
    .find({ userId })
    .toArray();

  return docs.map((doc) => ({
    id: (doc.id || doc._id?.toString()) as string,
    userId: doc.userId as string,
    orgId: doc.orgId as string,
    provider: doc.provider as "google" | "microsoft",
    accessToken: doc.accessToken as string,
    refreshToken: doc.refreshToken as string | null,
    tokenExpiry: doc.tokenExpiry as Date | null,
    calendarEmail: doc.calendarEmail as string,
    calendarName: doc.calendarName as string,
    syncEnabled: doc.syncEnabled as boolean,
    lastSyncAt: doc.lastSyncAt as Date | null,
  }));
}

export async function getCalendarEvents(
  userId: string,
  timeMin: string,
  timeMax: string
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
          await db.collection(collections.calendarConnections).updateOne(
            { id: conn.id },
            { $set: { accessToken: newToken, updatedAt: new Date() } }
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
        providerEvents = await getGoogleCalendarEvents(accessToken, timeMin, timeMax);
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
