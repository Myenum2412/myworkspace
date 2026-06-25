import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const orgId = searchParams.get("orgId");
  const fileId = searchParams.get("fileId");

  if (orgId) {
    const member = await db.collection(collections.orgMembers).findOne({ userId: session.user.id, orgId });
    if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const filter: Record<string, unknown> = { orgId };
    if (fileId) filter.fileId = fileId;

    const shares = await (await db.collection(collections.fileShares).find(filter)).sort({ createdAt: -1 }).toArray();
    const fIds = [...new Set(shares.map(s => s.fileId))];
    const files = await (await db.collection(collections.fileAttachments).find({ id: { $in: fIds }, deletedAt: null })).toArray();
    const fileMap = new Map(files.map(f => [f.id, f]));

    const result = shares.map(s => ({
      ...s, file: fileMap.get(s.fileId) ? {
        originalName: fileMap.get(s.fileId)!.originalName,
        mimeType: fileMap.get(s.fileId)!.mimeType,
        size: fileMap.get(s.fileId)!.size,
      } : undefined,
    }));

    return NextResponse.json({ data: result });
  }

  if (userId) {
    const shares = await (await db.collection(collections.fileShares).find({
      $or: [{ sharedWithUserId: userId }, { sharedByUserId: userId }],
    })).sort({ createdAt: -1 }).toArray();

    const fIds = [...new Set(shares.map(s => s.fileId))];
    const files = await (await db.collection(collections.fileAttachments).find({ id: { $in: fIds }, deletedAt: null })).toArray();
    const fileMap = new Map(files.map(f => [f.id, f]));

    const userIds = [...new Set(shares.map(s => s.sharedByUserId))];
    const users = await (await db.collection(collections.users).find({ id: { $in: userIds } })).toArray();
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const result = shares.map(s => ({
      ...s, file: fileMap.get(s.fileId) ? {
        originalName: fileMap.get(s.fileId)!.originalName,
        mimeType: fileMap.get(s.fileId)!.mimeType,
        size: fileMap.get(s.fileId)!.size,
      } : undefined,
      sharedByName: userMap.get(s.sharedByUserId) || "Unknown",
    }));

    return NextResponse.json({ data: result });
  }

  return NextResponse.json({ error: "userId or orgId is required" }, { status: 400 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId, sharedWithUserId, orgId } = await req.json();
  if (!fileId || !orgId) return NextResponse.json({ error: "fileId and orgId are required" }, { status: 400 });

  const member = await db.collection(collections.orgMembers).findOne({ userId: session.user.id, orgId });
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const file = await db.collection(collections.fileAttachments).findOne({ id: fileId, deletedAt: null });
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const shareId = uuid();
  await db.collection(collections.fileShares).insertOne({
    id: shareId, fileId, sharedByUserId: session.user.id,
    sharedWithUserId: sharedWithUserId || null, orgId, createdAt: new Date(),
  });

  await db.collection(collections.activityLogs).insertOne({
    id: uuid(), orgId, userId: session.user.id, action: "file.shared",
    entityType: "file", entityId: fileId,
    description: `File "${file.originalName}" shared`,
  });

  return NextResponse.json({ success: true, shareId }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const share = await db.collection(collections.fileShares).findOne({ id });
  if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 });

  if (share.orgId) {
    const member = await db.collection(collections.orgMembers).findOne({ userId: session.user.id, orgId: share.orgId });
    if (!member) return NextResponse.json({ error: "Not authorized to delete this share" }, { status: 403 });
  }

  await db.collection(collections.fileShares).deleteOne({ id });
  return NextResponse.json({ success: true });
}
