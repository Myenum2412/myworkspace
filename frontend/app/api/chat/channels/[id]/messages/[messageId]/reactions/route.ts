import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

interface StoredReaction {
  emoji: string;
  userId: string;
}

export async function POST(
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
  const emoji = String(body.emoji || "");
  if (!emoji) return NextResponse.json({ error: "Emoji is required" }, { status: 422 });

  try {
    const channel = await db.collection(collections.chatChannels).findOne({
      id,
      orgId,
      members: session.user.id,
    });
    if (!channel)
      return NextResponse.json({ error: "Channel not found or no access" }, { status: 404 });

    const msg = await db.collection(collections.chatMessages).findOne({ id: messageId, orgId });
    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const reactions: StoredReaction[] = Array.isArray(msg.reactions)
      ? (msg.reactions as StoredReaction[])
      : [];
    const existing = reactions.find((r) => r.emoji === emoji && r.userId === session.user.id);

    let next: StoredReaction[];
    if (existing) {
      next = reactions.filter((r) => !(r.emoji === emoji && r.userId === session.user.id));
    } else {
      next = [...reactions, { emoji, userId: session.user.id }];
    }

    await db
      .collection(collections.chatMessages)
      .updateOne({ id: messageId, orgId }, { $set: { reactions: next } });
    return NextResponse.json({ success: true, data: { reactions: next } });
  } catch {
    return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
  }
}
