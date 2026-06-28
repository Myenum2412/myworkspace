import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ensureUserOrg } from "@/lib/org";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);

  const files = await (await db.collection(collections.fileAttachments)
    .find({ orgId, deletedAt: null }))
    .sort({ updatedAt: -1 })
    .limit(20)
    .toArray();

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const users = await (await db.collection(collections.users).find({ id: { $in: userIds } })).toArray();
  const userMap = new Map(users.map(u => [u.id, u.name]));

  return NextResponse.json({
    data: files.map(f => ({ ...f, uploaderName: userMap.get(f.uploaderId) || "Unknown" })),
  });
}
