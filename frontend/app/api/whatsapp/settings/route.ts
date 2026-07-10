import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { requireUserOrgId } from "@/lib/org";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);

  const org = await db.collection(collections.organizations).findOne(
    { id: orgId },
    { projection: { whatsappNumber: 1, whatsappEnabled: 1, whatsappMode: 1, whatsappAllowedUsers: 1, whatsappSessionActive: 1 } }
  );

  return NextResponse.json({
    number: org?.whatsappNumber || "",
    enabled: !!org?.whatsappEnabled,
    mode: org?.whatsappMode || "bot",
    allowedUsers: org?.whatsappAllowedUsers || "",
    sessionActive: !!org?.whatsappSessionActive,
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if (body.number !== undefined) update.whatsappNumber = body.number;
  if (body.enabled !== undefined) update.whatsappEnabled = body.enabled;
  if (body.mode !== undefined) update.whatsappMode = body.mode;
  if (body.allowedUsers !== undefined) update.whatsappAllowedUsers = body.allowedUsers;

  await db.collection(collections.organizations).updateOne(
    { id: orgId },
    { $set: update }
  );

  return NextResponse.json({ success: true });
}
