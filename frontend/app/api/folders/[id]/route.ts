import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folder = await db.collection("folders").findOne({ id, deletedAt: null });
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

  const member = await db.collection(collections.orgMembers).findOne({ userId: session.user.id, orgId: folder.orgId });
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const children = await (await db.collection("folders").find({ parentId: id, deletedAt: null })).sort({ name: 1 }).toArray();
  return NextResponse.json({ data: { ...folder, children } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const folder = await db.collection("folders").findOne({ id, deletedAt: null });
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

  const member = await db.collection(collections.orgMembers).findOne({ userId: session.user.id, orgId: folder.orgId });
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const parent = folder.parentId ? await db.collection("folders").findOne({ id: folder.parentId }) : null;
  const newPath = parent ? `${parent.path}/${name}` : `/${name}`;

  const existing = await db.collection("folders").findOne({ orgId: folder.orgId, path: newPath, deletedAt: null, id: { $ne: id } });
  if (existing) return NextResponse.json({ error: "Folder name already exists" }, { status: 409 });

  const oldPath = folder.path;
  await db.collection("folders").updateOne({ id }, { $set: { name, path: newPath, updatedAt: new Date() } });
  await db.collection("folders").updateMany(
    { path: { $regex: `^${oldPath}/` } },
    { $set: { path: { $toString: { $concat: [newPath + "/", { $substrCP: ["$path", oldPath.length + 1, { $strLenCP: "$path" }] }] } } } }
  );

  await db.collection(collections.activityLogs).insertOne({
    id: uuid(), orgId: folder.orgId, userId: session.user.id, action: "folder.renamed",
    entityType: "folder", entityId: id,
    description: `Folder renamed from "${folder.name}" to "${name}"`,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folder = await db.collection("folders").findOne({ id, deletedAt: null });
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

  const member = await db.collection(collections.orgMembers).findOne({ userId: session.user.id, orgId: folder.orgId });
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const now = new Date();
  await db.collection("folders").updateMany(
    { $or: [{ id }, { path: { $regex: `^${folder.path}/` } }], orgId: folder.orgId },
    { $set: { deletedAt: now } }
  );
  await db.collection(collections.fileAttachments).updateMany(
    { orgId: folder.orgId, folderId: folder.id, deletedAt: null },
    { $set: { deletedAt: now, deletedBy: session.user.id } }
  );

  await db.collection(collections.activityLogs).insertOne({
    id: uuid(), orgId: folder.orgId, userId: session.user.id, action: "folder.deleted",
    entityType: "folder", entityId: id,
    description: `Folder "${folder.name}" and contents deleted`,
  });

  return NextResponse.json({ success: true });
}
