import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth/config";
import { saveFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const files = await db
    .collection(collections.fileAttachments)
    .find(
      { orgId: "demo-org-id" },
      { projection: { id: 1, originalName: 1, mimeType: 1, size: 1, createdAt: 1, uploaderId: 1 } }
    )
    .sort({ createdAt: -1 })
    .toArray();

  const users = await db
    .collection(collections.users)
    .find({}, { projection: { id: 1, name: 1 } })
    .toArray();

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const result = files.map((f) => ({
    ...f,
    uploaderName: userMap[f.uploaderId] || "Unknown",
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = saveFile(buffer, file.name);

  const fileId = uuid();
  await db.collection(collections.fileAttachments).insertOne({
    id: fileId,
    orgId: "demo-org-id",
    uploaderId: session.user.id,
    name: file.name,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    storagePath,
  });

  await db.collection(collections.activityLogs).insertOne({
    id: uuid(),
    orgId: "demo-org-id",
    userId: session.user.id,
    action: "file.uploaded",
    entityType: "file",
    entityId: fileId,
    description: `File "${file.name}" uploaded`,
  });

  return NextResponse.json({ success: true, fileId });
}
