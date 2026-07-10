import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { requireUserOrgId } from "@/lib/org";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);

  const org = await db.collection(collections.organizations).findOne({ id: orgId });
  const whatsappNumber = (org?.whatsappNumber as string) || "";

  return NextResponse.json({ whatsappNumber });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);

  const org = await db.collection(collections.organizations).findOne({ id: orgId });
  const whatsappNumber = (org?.whatsappNumber as string) || "";

  if (!whatsappNumber) {
    return NextResponse.json({ qrData: null, qrImageUrl: null, error: "No WhatsApp number configured" });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const wsName = (org?.name as string) || "MyWorkspace";
  const qrData = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, I'm contacting you from ${wsName}.`)}`;
  const qrImageUrl = `${QR_API}?size=300x300&data=${encodeURIComponent(qrData)}`;

  return NextResponse.json({ qrData, qrImageUrl });
}
