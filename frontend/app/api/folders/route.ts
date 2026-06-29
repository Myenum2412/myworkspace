import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ensureUserOrg } from "@/lib/org";
import { v4 as uuid } from "uuid";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let orgId = searchParams.get("orgId");
  const parentId = searchParams.get("parentId");

  // If no orgId provided, resolve it from the user's session
  if (!orgId) {
    try {
      orgId = await ensureUserOrg(session.user.id, session.user.email);
    } catch {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }
  }

  const filter: Record<string, unknown> = { orgId, deletedAt: null };
  if (parentId) {
    filter.parentId = parentId;
  } else {
    // Root level: show all top-level folders (both org and client-scoped)
    filter.parentId = null;
  }

  try {
    const folders = await db.collection("folders").find(filter, { sort: { clientId: 1, name: 1 } }).toArray();
    return NextResponse.json({ data: folders });
  } catch (err) {
    console.error("[API /api/folders] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, parentId, name, clientId } = await req.json();
  if (!orgId || !name) return NextResponse.json({ error: "orgId and name are required" }, { status: 400 });

  const parent = parentId ? await db.collection("folders").findOne({ id: parentId, deletedAt: null }) : null;
  const path = parent ? `${parent.path}/${name}` : `/${name}`;

  const existing = await db.collection("folders").findOne({ orgId, path, deletedAt: null });
  if (existing) return NextResponse.json({ error: "Folder already exists" }, { status: 409 });

  const id = uuid();
  await db.collection("folders").insertOne({
    id, orgId, parentId: parentId || null, name, path, clientId: clientId || null,
    createdBy: session.user.id, deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
  });

  await db.collection(collections.activityLogs).insertOne({
    id: uuid(), orgId, userId: session.user.id, action: "folder.created",
    entityType: "folder", entityId: id,
    description: `Folder "${name}" created`,
  });

  return NextResponse.json({ success: true, folderId: id }, { status: 201 });
}
