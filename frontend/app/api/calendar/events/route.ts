import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getCalendarEvents } from "@/lib/services/calendar-service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");

  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: "Missing timeMin or timeMax" }, { status: 400 });
  }

  try {
    const events = await getCalendarEvents(session.user.id, timeMin, timeMax);
    return NextResponse.json({ data: events });
  } catch (err) {
    console.error("[Calendar Events]", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
