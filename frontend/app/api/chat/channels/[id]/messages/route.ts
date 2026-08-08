import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ messages: [] });

  const { id } = await params;
  try {
    const channel = await db.collection(collections.chatChannels).findOne({
      id,
      orgId,
      members: session.user.id,
    });
    if (!channel)
      return NextResponse.json({ error: "Channel not found or no access" }, { status: 404 });

    const docs = await db
      .collection(collections.chatMessages)
      .find({ orgId, channelId: id })
      .sort({ createdAt: 1 })
      .toArray();

    const messages = (docs as any[]).map((m) => ({
      id: m.id || String(m._id),
      conversationId: m.channelId || "",
      senderId: m.senderId || "",
      senderName: m.senderName || "",
      senderAvatar: m.senderAvatar || "",
      text: m.content || "",
      type: m.messageType || "text",
      replyTo: m.replyTo || null,
      reactions: m.reactions || [],
      readBy: m.readBy || [],
      edited: !!m.edited,
      deleted: !!m.deleted,
      pinned: !!m.pinned,
      attachments: m.attachments || [],
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : "",
    }));

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const now = new Date();
    const msgId = randomUUID();
    const doc = {
      id: msgId,
      orgId,
      channelId: id,
      senderId: session.user.id,
      senderName: session.user.name || "User",
      senderAvatar: session.user.image || "",
      content: content.trim(),
      messageType: body.messageType || "text",
      replyTo: body.replyTo ? String(body.replyTo) : null,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      readBy: [],
      reactions: [],
      edited: false,
      deleted: false,
      pinned: false,
      createdAt: now,
    };
    await db.collection(collections.chatMessages).insertOne(doc);
    await db
      .collection(collections.chatChannels)
      .updateOne({ id, orgId }, { $set: { updatedAt: now } });
    return NextResponse.json(
      {
        success: true,
        data: { message: { id: msgId, content: doc.content, createdAt: now.toISOString() } },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
