import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { syncCalendarEvents } from "@/lib/services/calendar-service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });
    }

    const result = await syncCalendarEvents(session.user.id, connectionId);

    return NextResponse.json({
      data: {
        synced: result.synced,
        errors: result.errors,
        message: `Synced ${result.synced} events with ${result.errors} errors`,
      },
    });
  } catch (err) {
    console.error("[Calendar Sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await import("@/lib/db");
    const { collections } = await import("@/lib/db/schema");

    // Get connections with sync status
    const connections = await db
      .collection(collections.calendarConnections)
      .find({ userId: session.user.id })
      .project({
        id: 1,
        provider: 1,
        calendarEmail: 1,
        syncEnabled: 1,
        lastSyncAt: 1,
        webhookChannelId: 1,
        webhookExpiration: 1,
      })
      .toArray();

    // Get event counts
    const eventCount = await db
      .collection(collections.calendarEvents)
      .countDocuments({ userId: session.user.id });

    return NextResponse.json({
      data: {
        connections: connections.map((c) => ({
          id: c.id,
          provider: c.provider,
          calendarEmail: c.calendarEmail,
          syncEnabled: c.syncEnabled,
          lastSyncAt: c.lastSyncAt,
          webhookActive: !!c.webhookChannelId,
          webhookExpiration: c.webhookExpiration,
        })),
        totalEvents: eventCount,
      },
    });
  } catch (err) {
    console.error("[Calendar Sync Status]", err);
    return NextResponse.json({ error: "Could not get sync status" }, { status: 500 });
  }
}
