import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getCalendarEvents, createCalendarEvent } from "@/lib/services/calendar-service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");
  const calendarId = searchParams.get("calendarId") || undefined;

  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: "Missing timeMin or timeMax" }, { status: 400 });
  }

  try {
    const events = await getCalendarEvents(session.user.id, timeMin, timeMax, calendarId);
    return NextResponse.json({ data: events });
  } catch (err) {
    console.error("[Calendar Events]", err);
    return NextResponse.json({ error: "Could not load calendar events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { connectionId, title, description, location, start, end, allDay, calendarId, attendees, reminders, status } = body;

    if (!connectionId || !title || !start || !end) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const event = await createCalendarEvent(session.user.id, connectionId, {
      title,
      description,
      location,
      start,
      end,
      allDay: allDay || false,
      calendarId,
      attendees,
      reminders,
      status: status || "confirmed",
    });

    if (!event) {
      return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
    }

    return NextResponse.json({ data: event });
  } catch (err) {
    console.error("[Calendar Create Event]", err);
    return NextResponse.json({ error: "Could not create event" }, { status: 500 });
  }
}
