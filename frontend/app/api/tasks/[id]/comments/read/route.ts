import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";

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

    // Add session.user.id to seenBy array for all comments in this task
    await db.collection(collections.taskComments).updateMany(
      { taskId: id, seenBy: { $ne: session.user.id } },
      { $addToSet: { seenBy: session.user.id } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark comments as read", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
