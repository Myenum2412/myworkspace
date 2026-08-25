import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ channels: [] });
  try {
    const docs = await db
      .collection(collections.chatChannels)
      .find({ orgId, members: session.user.id })
      .sort({ updatedAt: -1 })
      .toArray();

    const lastMessages = await db
      .collection(collections.chatMessages)
      .aggregate([
        { $match: { orgId, channelId: { $in: docs.map((d) => d.id) } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$channelId",
            lastMessage: { $first: "$$ROOT" },
          },
        },
      ])
      .toArray();

    const lastMsgMap = new Map(lastMessages.map((r) => [String(r._id), r.lastMessage]));

    const unreadCounts = await db
      .collection(collections.chatMessages)
      .aggregate([
        {
          $match: {
            orgId,
            senderId: { $ne: session.user.id },
            deleted: { $ne: true },
            readBy: { $ne: session.user.id },
          },
        },
        {
          $group: {
            _id: "$channelId",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    const unreadMap = new Map(unreadCounts.map((r) => [String(r._id), r.count]));

    const channels = docs.map((d) => {
      const last = lastMsgMap.get(d.id);
      return {
        id: d.id,
        type: d.type || "channel",
        name: d.name || "",
        description: d.description || "",
        icon: d.icon || "",
        members: (d.members || []).filter((id: string) => id !== session.user.id),
        allMembers: d.members || [],
        createdBy: d.createdBy || "",
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : "",
        updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : "",
        lastMessage: last
          ? {
              id: last.id || String(last._id),
              text: last.content || "",
              senderId: last.senderId || "",
              senderName: last.senderName || "",
              timestamp: last.createdAt ? new Date(last.createdAt).toISOString() : "",
            }
          : null,
        messageCount: last ? (last.messageCount as number) || 0 : 0,
        unreadCount: unreadMap.get(d.id) || 0,
      };
    });

    return NextResponse.json({ channels });
  } catch {
    return NextResponse.json({ channels: [] });
  }
}

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = String(body.type || "channel");
  const rawMembers = Array.isArray(body.members) ? (body.members as string[]) : [];
  const members = [...new Set([session.user.id, ...rawMembers])] as string[];

  if (type === "dm" && members.length !== 2) {
    return NextResponse.json(
      { error: "A direct message needs exactly 2 members" },
      { status: 422 },
    );
  }
  if ((type === "group" || type === "channel") && !String(body.name || "").trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 422 });
  }
  if ((type === "group" || type === "channel") && members.length < 2) {
    return NextResponse.json({ error: "Add at least one member" }, { status: 422 });
  }

  try {
    // Reuse an existing DM between the same pair
    if (type === "dm") {
      const existing = await db.collection(collections.chatChannels).findOne({
        orgId,
        type: "dm",
        members: { $all: members, $size: 2 },
      });
      if (existing) {
        return NextResponse.json({
          success: true,
          data: { channel: { id: existing.id } },
        });
      }
    }

    const id = randomUUID();
    const now = new Date();
    const doc = {
      id,
      orgId,
      type,
      name: type === "dm" ? "" : String(body.name || "").trim(),
      description: String(body.description || "").trim(),
      icon: String(body.icon || ""),
      members,
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(collections.chatChannels).insertOne(doc);
    return NextResponse.json({ success: true, data: { channel: { id } } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
  }
}
