import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  const redirectUri = process.env.MICROSOFT_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/calendar/microsoft/callback`;

  if (!clientId || clientId === "YOUR_MICROSOFT_CLIENT_ID") {
    return NextResponse.redirect(
      new URL("/?error=microsoft_not_configured", process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000")
    );
  }

  const scopes = ["Calendars.Read", "offline_access"].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state: session.user.id,
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`
  );
}
