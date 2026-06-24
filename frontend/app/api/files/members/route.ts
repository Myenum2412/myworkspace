import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

  const member = await db.collection(collections.orgMembers).findOne({ userId: session.user.id, orgId });
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const members = await (await db.collection(collections.orgMembers).find({ orgId })).toArray();
  const userIds = members.map(m => m.userId);
  const users = await (await db.collection(collections.users).find({ id: { $in: userIds } })).toArray();
  const userMap = new Map(users.map(u => [u.id, u]));

  const result = members.map(m => {
    const user = userMap.get(m.userId);
    return { userId: m.userId, name: user?.name || "Unknown", email: user?.email || "", role: m.role };
  });

  return NextResponse.json({ data: result });
}
