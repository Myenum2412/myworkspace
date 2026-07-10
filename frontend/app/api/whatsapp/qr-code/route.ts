import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { requireUserOrgId } from "@/lib/org";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { randomUUID } from "crypto";

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.collection("whatsapp_connections").insertOne({
    orgId,
    token,
    status: "pending",
    expiresAt,
    createdAt: new Date(),
  });

  const qrData = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/whatsapp/connect?token=${token}&orgId=${orgId}`;
  const qrImageUrl = `${QR_API}?size=300x300&data=${encodeURIComponent(qrData)}`;

  return NextResponse.json({ qrData, qrImageUrl, token, expiresAt });
}
