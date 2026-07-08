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

  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/calendar/microsoft/callback`;

  if (!clientId || clientId === "YOUR_MICROSOFT_CLIENT_ID") {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=microsoft_not_configured", req.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret || "",
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        new URL("/settings/integrations?error=token_exchange_failed", req.url)
      );
    }

    // Get user info from Microsoft Graph
    const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    // Store connection in DB
    const userId = state;
    const orgMember = await db.collection(collections.orgMembers).findOne({ userId });
    const orgId = orgMember?.orgId || "";

    // Remove existing Microsoft connection for this user
    await db.collection(collections.calendarConnections).deleteMany({
      userId,
      provider: "microsoft",
    });

    await db.collection(collections.calendarConnections).insertOne({
      id: uuid(),
      userId,
      orgId,
      provider: "microsoft",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenExpiry: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
      calendarEmail: userData.mail || userData.userPrincipalName || "",
      calendarName: "Outlook Calendar",
      syncEnabled: true,
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.redirect(
      new URL("/settings/integrations?success=microsoft_connected", req.url)
    );
  } catch (err) {
    console.error("[Microsoft Calendar Callback]", err);
    return NextResponse.redirect(
      new URL("/settings/integrations?error=callback_failed", req.url)
    );
  }
}
