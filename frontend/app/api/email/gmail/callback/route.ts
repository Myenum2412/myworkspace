import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${error}`, req.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/?error=missing_params", req.url)
    );
  }

  try {
    const redirectUri = process.env.GMAIL_REDIRECT_URI || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/email/gmail/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        new URL("/?error=token_exchange_failed", req.url)
      );
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    const userId = state;
    const orgMember = await db.collection(collections.orgMembers).findOne({ userId });
    const orgId = orgMember?.orgId || "";

    await db.collection(collections.emailConnections).deleteMany({
      userId,
      provider: "gmail",
    });

    await db.collection(collections.emailConnections).insertOne({
      id: uuid(),
      userId,
      orgId,
      provider: "gmail",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenExpiry: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
      email: userData.email || "",
      name: "Gmail",
      syncEnabled: true,
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.redirect(
      new URL("/?success=gmail_connected", req.url)
    );
  } catch (err) {
    console.error("[Gmail Callback]", err);
    return NextResponse.redirect(
      new URL("/?error=callback_failed", req.url)
    );
  }
}
