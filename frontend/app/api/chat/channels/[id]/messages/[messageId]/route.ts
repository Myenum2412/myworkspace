import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });

  const { id, messageId } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const content = String(body.content || "");
  if (!content.trim()) return NextResponse.json({ error: "Message is required" }, { status: 422 });

  try {
    const channel = await db.collection(collections.chatChannels).findOne({
      id,
      orgId,
      members: session.user.id,
    });
    if (!channel)
      return NextResponse.json({ error: "Channel not found or no access" }, { status: 404 });

    const msg = await db.collection(collections.chatMessages).findOne({
      id: messageId,
      orgId,
      channelId: id,
      senderId: session.user.id,
    });
    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    await db.collection(collections.chatMessages).updateOne(
      { id: messageId, orgId },
      {
        $set: {
          content: content.trim(),
          edited: true,
          editedAt: new Date(),
        },
      },
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to edit message" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });

  const { id, messageId } = await params;
  try {
    const channel = await db.collection(collections.chatChannels).findOne({
      id,
      orgId,
      members: session.user.id,
    });
    if (!channel)
      return NextResponse.json({ error: "Channel not found or no access" }, { status: 404 });

    const msg = await db.collection(collections.chatMessages).findOne({
      id: messageId,
      orgId,
      channelId: id,
      senderId: session.user.id,
    });
    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    await db.collection(collections.chatMessages).updateOne(
      { id: messageId, orgId },
      {
        $set: {
          deleted: true,
          deletedAt: new Date(),
        },
      },
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
