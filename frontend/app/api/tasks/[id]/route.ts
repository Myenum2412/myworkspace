import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { ObjectId } from "mongodb";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, rejectionReason, approvalNote } = body;

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const validStatuses = ["todo", "in_progress", "review", "done", "cancelled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updateFields: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (status === "done") {
    updateFields.approvedBy = session.user.id;
    updateFields.approvedAt = new Date();
    updateFields.approvalNote = approvalNote || null;
    updateFields.rejectedBy = null;
    updateFields.rejectedAt = null;
    updateFields.rejectionReason = null;
  }

  if (status === "cancelled") {
    updateFields.rejectedBy = session.user.id;
    updateFields.rejectedAt = new Date();
    updateFields.rejectionReason = rejectionReason || null;
    updateFields.approvedBy = null;
    updateFields.approvedAt = null;
    updateFields.approvalNote = null;
  }

  try {
    const filter = { _id: new ObjectId(id) };
    const result = await db.collection(collections.tasks).findOneAndUpdate(
      filter,
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
