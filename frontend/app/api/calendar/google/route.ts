import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/calendar/google/callback`;

  if (!clientId) {
    return NextResponse.json({ error: "Google Calendar not configured" }, { status: 500 });
  }

  // Full calendar access scopes for two-way sync
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.settings.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  // Generate a random state nonce for CSRF protection
  const state = JSON.stringify({
    userId: session.user.id,
    nonce: crypto.randomUUID(),
    timestamp: Date.now(),
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state: Buffer.from(state).toString("base64"),
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
