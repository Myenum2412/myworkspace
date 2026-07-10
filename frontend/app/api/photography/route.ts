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
    { projection: { photographyInstalled: 1 } }
  );

  return NextResponse.json({ installed: !!org?.photographyInstalled });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);

  const org = await db.collection(collections.organizations).findOne({ id: orgId });
  const current = !!org?.photographyInstalled;

  await db.collection(collections.organizations).updateOne(
    { id: orgId },
    { $set: { photographyInstalled: !current } }
  );

  return NextResponse.json({ installed: !current });
}
