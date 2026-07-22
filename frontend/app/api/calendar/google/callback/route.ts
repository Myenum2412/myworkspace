import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { encryptToken } from "@/lib/services/calendar-service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${error}`, req.url)
    );
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL("/?error=missing_params", req.url)
    );
  }

  try {
    // Decode and validate state
    const state = JSON.parse(Buffer.from(stateParam, "base64").toString());
    const userId = state.userId;

    // Validate state freshness (5 minutes max)
    if (Date.now() - state.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        new URL("/?error=state_expired", req.url)
      );
    }

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
        new URL("/?error=token_exchange_failed", req.url)
      );
    }

    // Get user info to store email
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    // Get org ID from user
    const orgMember = await db.collection(collections.orgMembers).findOne({ userId });
    const orgId = orgMember?.orgId || "";

    // Encrypt tokens before storage
    const encryptedAccessToken = encryptToken(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token
      ? encryptToken(tokenData.refresh_token)
      : null;

    // Calculate token expiry
    const tokenExpiry = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // Remove existing Google connection for this user
    await db.collection(collections.calendarConnections).deleteMany({
      userId,
      provider: "google",
    });

    // Store new connection with encrypted tokens
    await db.collection(collections.calendarConnections).insertOne({
      id: uuid(),
      userId,
      orgId,
      provider: "google",
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiry,
      calendarEmail: userData.email || "",
      calendarName: "Google Calendar",
      syncEnabled: true,
      lastSyncAt: null,
      syncToken: null,
      webhookChannelId: null,
      webhookExpiration: null,
      scopes: tokenData.scope?.split(" ") || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.redirect(
      new URL("/?success=google_connected", req.url)
    );
  } catch (err) {
    console.error("[Google Calendar Callback]", err);
    return NextResponse.redirect(
      new URL("/?error=callback_failed", req.url)
    );
  }
}
