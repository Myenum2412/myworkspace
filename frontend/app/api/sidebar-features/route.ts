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
    { projection: { hiddenSidebarFeatures: 1 } }
  );

  return NextResponse.json({
    hidden: (org?.hiddenSidebarFeatures as string[]) || [],
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);
  const body = await request.json();

  await db.collection(collections.organizations).updateOne(
    { id: orgId },
    { $set: { hiddenSidebarFeatures: body.hidden || [] } }
  );

  return NextResponse.json({ success: true });
}
