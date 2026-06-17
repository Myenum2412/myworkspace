import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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

  const files = db
    .select({
      id: schema.fileAttachments.id,
      originalName: schema.fileAttachments.originalName,
      mimeType: schema.fileAttachments.mimeType,
      size: schema.fileAttachments.size,
      createdAt: schema.fileAttachments.createdAt,
      uploaderId: schema.fileAttachments.uploaderId,
    })
    .from(schema.fileAttachments)
    .where(eq(schema.fileAttachments.orgId, "demo-org-id"))
    .orderBy(desc(schema.fileAttachments.createdAt))
    .all();

  const users = db
    .select({
      id: schema.users.id,
      name: schema.users.name,
    })
    .from(schema.users)
    .all();

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
  db.insert(schema.fileAttachments).values({
    id: fileId,
    orgId: "demo-org-id",
    uploaderId: session.user.id,
    name: file.name,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    storagePath,
  }).run();

  db.insert(schema.activityLogs).values({
    id: uuid(),
    orgId: "demo-org-id",
    userId: session.user.id,
    action: "file.uploaded",
    entityType: "file",
    entityId: fileId,
    description: `File "${file.name}" uploaded`,
  }).run();

  return NextResponse.json({ success: true, fileId });
}
