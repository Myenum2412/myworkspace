import { NextResponse } from "next/server";
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
    { projection: { doctorKitInstalled: 1 } }
  );

  return NextResponse.json({ installed: !!org?.doctorKitInstalled });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);

  const org = await db.collection(collections.organizations).findOne({ id: orgId });
  const current = !!org?.doctorKitInstalled;

  await db.collection(collections.organizations).updateOne(
    { id: orgId },
    { $set: { doctorKitInstalled: !current } }
  );

  return NextResponse.json({ installed: !current });
}
