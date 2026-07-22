import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/services/calendar-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const event = await db.collection(collections.calendarEvents).findOne({
      id,
      userId: session.user.id,
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: event.id,
        externalId: event.externalId,
        title: event.title,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        status: event.status,
        attendees: event.attendees,
        organizer: event.organizer,
        conferenceData: event.conferenceData,
        reminders: event.reminders,
        color: event.color,
        calendarId: event.calendarId,
        connectionId: event.connectionId,
      },
    });
  } catch (err) {
    console.error("[Calendar Get Event]", err);
    return NextResponse.json({ error: "Could not get event" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get the event to find connectionId and externalId
    const existingEvent = await db.collection(collections.calendarEvents).findOne({
      id,
      userId: session.user.id,
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, location, start, end, allDay, calendarId, attendees, reminders, status } = body;

    const updated = await updateCalendarEvent(
      session.user.id,
      existingEvent.connectionId,
      existingEvent.externalId,
      {
        title: title || existingEvent.title,
        description: description !== undefined ? description : existingEvent.description,
        location: location !== undefined ? location : existingEvent.location,
        start: start || existingEvent.start.toISOString(),
        end: end || existingEvent.end.toISOString(),
        allDay: allDay !== undefined ? allDay : existingEvent.allDay,
        calendarId: calendarId || existingEvent.calendarId,
        attendees: attendees || existingEvent.attendees,
        reminders: reminders || existingEvent.reminders,
        status: status || existingEvent.status,
      }
    );

    if (!updated) {
      return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
    }

    // Update local database
    await db.collection(collections.calendarEvents).updateOne(
      { id },
      {
        $set: {
          title: updated.title,
          description: updated.description,
          location: updated.location,
          start: new Date(updated.start),
          end: new Date(updated.end),
          allDay: updated.allDay,
          status: updated.status,
          etag: updated.etag || "",
          lastModified: new Date(updated.lastModified || Date.now()),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[Calendar Update Event]", err);
    return NextResponse.json({ error: "Could not update event" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get the event to find connectionId and externalId
    const existingEvent = await db.collection(collections.calendarEvents).findOne({
      id,
      userId: session.user.id,
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const deleted = await deleteCalendarEvent(
      session.user.id,
      existingEvent.connectionId,
      existingEvent.externalId,
      existingEvent.calendarId
    );

    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
    }

    // Remove from local database
    await db.collection(collections.calendarEvents).deleteOne({ id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Calendar Delete Event]", err);
    return NextResponse.json({ error: "Could not delete event" }, { status: 500 });
  }
}
