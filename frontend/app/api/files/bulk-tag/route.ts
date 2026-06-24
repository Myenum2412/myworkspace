import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileIds, tags, action } = await req.json();
  if (!fileIds?.length || !tags?.length) return NextResponse.json({ error: "fileIds and tags are required" }, { status: 400 });

  const files = await (await db.collection(collections.fileAttachments).find({ id: { $in: fileIds }, deletedAt: null })).toArray();
  if (!files.length) return NextResponse.json({ error: "No files found" }, { status: 404 });

  const member = await db.collection(collections.orgMembers).findOne({ userId: session.user.id, orgId: files[0].orgId });
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  if (action === "remove") {
    await db.collection(collections.fileAttachments).updateMany(
      { id: { $in: fileIds } },
      { $pullAll: { tags } }
    );
  } else {
    await db.collection(collections.fileAttachments).updateMany(
      { id: { $in: fileIds } },
      { $addToSet: { tags: { $each: tags } } }
    );
  }

  return NextResponse.json({ success: true });
}
