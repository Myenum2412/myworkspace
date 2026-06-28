import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ensureUserOrg } from "@/lib/org";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);

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
