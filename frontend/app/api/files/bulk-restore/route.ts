import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileIds } = await req.json();
  if (!fileIds?.length) return NextResponse.json({ error: "fileIds is required" }, { status: 400 });

  const files = await (await db.collection(collections.fileAttachments).find({ id: { $in: fileIds }, deletedAt: { $ne: null } })).toArray();
  if (!files.length) return NextResponse.json({ error: "No files found in trash" }, { status: 404 });

  const member = await db.collection(collections.orgMembers).findOne({ userId: session.user.id, orgId: files[0].orgId });
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await db.collection(collections.fileAttachments).updateMany(
    { id: { $in: fileIds }, deletedAt: { $ne: null } },
    { $set: { deletedAt: null, deletedBy: null } }
  );

  return NextResponse.json({ success: true, restored: fileIds.length });
}
