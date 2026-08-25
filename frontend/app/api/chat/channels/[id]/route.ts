import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });

  const { id } = await params;
  try {
    const channel = await db
      .collection(collections.chatChannels)
      .findOne({ id, orgId, createdBy: session.user.id });
    if (!channel)
      return NextResponse.json(
        { error: "Channel not found or only creator can delete" },
        { status: 404 },
      );
    await db.collection(collections.chatChannels).deleteOne({ id, orgId });
    await db.collection(collections.chatMessages).deleteMany({ orgId, channelId: id });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const channel = await db
      .collection(collections.chatChannels)
      .findOne({ id, orgId, members: session.user.id });
    if (!channel)
      return NextResponse.json({ error: "Channel not found or no access" }, { status: 404 });

    const update: Record<string, unknown> = {};
    if (typeof body.name === "string") update.name = body.name.trim();
    if (typeof body.description === "string") update.description = body.description.trim();
    if (typeof body.icon === "string") update.icon = body.icon;
    if (typeof body.members === "object" && Array.isArray(body.members)) {
      update.members = [...new Set([session.user.id, ...(body.members as string[])])];
    }
    update.updatedAt = new Date();
    await db.collection(collections.chatChannels).updateOne({ id, orgId }, { $set: update });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update channel" }, { status: 500 });
  }
}
