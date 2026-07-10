import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const orgId = searchParams.get("orgId");

  if (!token || !orgId) {
    return NextResponse.json({ error: "Missing token or orgId" }, { status: 400 });
  }

  const connection = await db.collection("whatsapp_connections").findOne({ token, orgId });

  if (!connection) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  if (connection.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 410 });
  }

  await db.collection("whatsapp_connections").updateOne(
    { _id: connection._id },
    { $set: { status: "connected", connectedAt: new Date() } }
  );

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings?whatsapp=connected`
  );
}
