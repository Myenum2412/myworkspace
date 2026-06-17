import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .collection(collections.users)
    .find({ id: session.user.id })
    .toArray();

  const [membership] = await db
    .collection(collections.orgMembers)
    .find({ userId: session.user.id })
    .toArray();

  let org = null;
  let memberCount = 0;
  if (membership) {
    org = await db
      .collection(collections.organizations)
      .findOne({ id: membership.orgId });

    const members = await db
      .collection(collections.orgMembers)
      .find({ orgId: membership.orgId })
      .toArray();
    memberCount = members.length;
  }

  return NextResponse.json({ user: dbUser, org, memberCount });
}
