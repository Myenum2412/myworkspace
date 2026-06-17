import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shares = await db.collection(collections.fileShares).aggregate([
    { $match: { orgId: "demo-org-id" } },
    {
      $lookup: {
        from: collections.fileAttachments,
        localField: "fileId",
        foreignField: "id",
        as: "file",
      },
    },
    { $unwind: { path: "$file", preserveNullAndEmptyArrays: true } },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        id: 1,
        fileId: 1,
        sharedByUserId: 1,
        createdAt: 1,
        "file.originalName": 1,
        "file.mimeType": 1,
        "file.size": 1,
      },
    },
  ]).toArray();

  const userIds = [...new Set(shares.map((s) => s.sharedByUserId))];
  const users = userIds.length > 0
    ? await db
        .collection(collections.users)
        .find({}, { projection: { id: 1, name: 1 } })
        .toArray()
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const result = shares.map((s) => ({
    id: s.id,
    fileId: s.fileId,
    sharedByUserId: s.sharedByUserId,
    createdAt: s.createdAt,
    originalName: s.file?.originalName,
    mimeType: s.file?.mimeType,
    size: s.file?.size,
    sharedByName: userMap[s.sharedByUserId] || "Unknown",
  }));

  return NextResponse.json(result);
}
