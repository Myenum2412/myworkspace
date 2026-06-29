import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { ObjectId } from "mongodb";
import { requireUserOrgId, validateOrgMembership } from "@/lib/org";

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

  try {
    let taskFilter: Record<string, unknown>;
    try {
      taskFilter = { _id: new ObjectId(id) };
    } catch {
      taskFilter = { id };
    }

    const task = await db.collection(collections.tasks).findOne(taskFilter);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskOrgId = (task.orgId as string) || "";
    if (taskOrgId) {
      const isMember = await validateOrgMembership(session.user.id, taskOrgId);
      if (!isMember) {
        return NextResponse.json({ error: "Not authorized to modify this task" }, { status: 403 });
      }
    } else {
      const userOrgId = await requireUserOrgId(session.user.id, session.user.email, session.user.orgId);
      await db.collection(collections.tasks).updateOne(taskFilter, { $set: { orgId: userOrgId } });
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

    const result = await db.collection(collections.tasks).findOneAndUpdate(
      taskFilter,
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
