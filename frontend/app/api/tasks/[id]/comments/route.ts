import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const comments = await db
      .collection(collections.taskComments)
      .find({ taskId: id })
      .sort({ createdAt: 1 })
      .toArray();

    const userIds = [...new Set(comments.map((c: Record<string, unknown>) => c.senderId as string))];
    const users = userIds.length > 0
      ? await db.collection(collections.users).find({ id: { $in: userIds } }, { projection: { id: 1, name: 1, image: 1 } }).toArray()
      : [];
    const userMap = new Map((users as unknown as Record<string, unknown>[]).map((u) => [u.id as string, { name: u.name as string || "", image: u.image as string || "" }]));

    const data = (comments as unknown as Record<string, unknown>[]).map((c) => {
      const sender = userMap.get(c.senderId as string);
      return {
        id: (c._id as ObjectId).toString(),
        taskId: c.taskId,
        senderId: c.senderId,
        senderName: sender?.name || (c.senderName as string) || "Unknown",
        senderAvatar: sender?.image || "",
        content: c.content,
        createdAt: c.createdAt,
        seenBy: Array.isArray(c.seenBy) ? c.seenBy : [],
      };
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const doc = {
      taskId: id,
      senderId: session.user.id,
      content: content.trim(),
      createdAt: new Date(),
      seenBy: [session.user.id],
    };

    const result = await db.collection(collections.taskComments).insertOne(doc);

    return NextResponse.json({
      data: {
        id: result.insertedId.toString(),
        ...doc,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
