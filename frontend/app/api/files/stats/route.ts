import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

async function ensureOrg(userId: string): Promise<string | null> {
  const member = await db.collection(collections.orgMembers).findOne({ userId });
  if (member?.orgId) return String(member.orgId);

  const user = await db.collection(collections.users).findOne({ id: userId });
  const userName = user?.name || user?.email?.split("@")[0] || "User";
  const newOrgId = uuid();
  await db.collection(collections.organizations).insertOne({
    id: newOrgId,
    name: `${userName}'s Organization`,
    slug: userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId.slice(0, 8)}`,
    plan: "starter",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.collection(collections.orgMembers).insertOne({
    id: uuid(),
    orgId: newOrgId,
    userId,
    role: "admin",
    joinedAt: new Date(),
  });
  return newOrgId;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureOrg(session.user.id);
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  const [totalFiles, deletedFiles, totalSizeAgg] = await Promise.all([
    db.collection(collections.fileAttachments).countDocuments({ orgId, deletedAt: null }),
    db.collection(collections.fileAttachments).countDocuments({ orgId, deletedAt: { $ne: null } }),
    db.collection(collections.fileAttachments).aggregate([
      { $match: { orgId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$size" } } },
    ]).toArray(),
  ]);

  const totalSize = totalSizeAgg[0]?.total || 0;

  const mimeBreakdown = await db.collection(collections.fileAttachments).aggregate([
    { $match: { orgId, deletedAt: null } },
    { $group: { _id: { $arrayElemAt: [{ $split: ["$mimeType", "/"] }, 0] }, count: { $sum: 1 }, size: { $sum: "$size" } } },
  ]).toArray();

  return NextResponse.json({
    data: { totalFiles, totalSize: Math.round(totalSize / (1024 * 1024) * 100) / 100, deletedFiles, mimeBreakdown },
  });
}
