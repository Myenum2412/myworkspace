import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getCalendarList } from "@/lib/services/calendar-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const calendars = await getCalendarList(session.user.id);
    return NextResponse.json({ data: calendars });
  } catch (err) {
    console.error("[Calendar List]", err);
    return NextResponse.json({ error: "Could not load calendar list" }, { status: 500 });
  }
}
