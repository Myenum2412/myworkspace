import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileIds } = await req.json();
  if (!fileIds?.length) return NextResponse.json({ error: "fileIds is required" }, { status: 400 });

  const files = await (await db.collection(collections.fileAttachments).find({ id: { $in: fileIds }, deletedAt: null })).toArray();
  if (!files.length) return NextResponse.json({ error: "No files found" }, { status: 404 });

  const orgId = files[0].orgId;
  const member = await db.collection(collections.orgMembers).findOne({ userId: session.user.id, orgId });
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const now = new Date();
  await db.collection(collections.fileAttachments).updateMany(
    { id: { $in: fileIds }, deletedAt: null },
    { $set: { deletedAt: now, deletedBy: session.user.id } }
  );

  return NextResponse.json({ success: true, deleted: fileIds.length });
}
