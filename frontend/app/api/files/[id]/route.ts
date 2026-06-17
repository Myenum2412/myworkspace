import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { getFilePath, deleteFile } from "@/lib/storage";
import fs from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const file = await db
    .collection(collections.fileAttachments)
    .findOne({ id });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const filePath = getFilePath(file.storagePath);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  const content = fs.readFileSync(filePath);
  return new NextResponse(content, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.originalName}"`,
      "Content-Length": String(file.size),
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const file = await db
    .collection(collections.fileAttachments)
    .findOne({ id });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.uploaderId !== session.user.id) {
    return NextResponse.json({ error: "Not your file" }, { status: 403 });
  }

  deleteFile(file.storagePath);
  await db.collection(collections.fileAttachments).deleteOne({ id });

  return NextResponse.json({ success: true });
}
