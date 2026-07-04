import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, commentId } = await params;

    const result = await db.collection(collections.taskComments).deleteOne({
      _id: new ObjectId(commentId),
      taskId: id,
      senderId: session.user.id, // Ensure only the sender can delete
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Comment not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, commentId } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const result = await db.collection(collections.taskComments).updateOne(
      {
        _id: new ObjectId(commentId),
        taskId: id,
        senderId: session.user.id, // Ensure only the sender can edit
      },
      {
        $set: { content: content.trim(), updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Comment not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, content: content.trim() });
  } catch {
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}
