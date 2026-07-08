import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${error}`, req.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=missing_params", req.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        redirect_uri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/calendar/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=token_exchange_failed", req.url)
      );
    }

    // Get user info to store email
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    // Store connection in DB
    const userId = state;
    const user = await db.collection(collections.users).findOne({ id: userId });
    const orgMember = await db.collection(collections.orgMembers).findOne({ userId });
    const orgId = orgMember?.orgId || "";

    // Remove existing Google connection for this user
    await db.collection(collections.calendarConnections).deleteMany({
      userId,
      provider: "google",
    });

    await db.collection(collections.calendarConnections).insertOne({
      id: uuid(),
      userId,
      orgId,
      provider: "google",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenExpiry: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
      calendarEmail: userData.email || "",
      calendarName: "Google Calendar",
      syncEnabled: true,
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.redirect(
      new URL("/settings/integrations?success=google_connected", req.url)
    );
  } catch (err) {
    console.error("[Google Calendar Callback]", err);
    return NextResponse.redirect(
      new URL("/settings/integrations?error=callback_failed", req.url)
    );
  }
}
