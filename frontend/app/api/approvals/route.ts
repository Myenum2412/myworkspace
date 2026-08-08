import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ items: [] });
  try {
    const raw = await db
      .collection(collections.tasks)
      .find({ orgId, status: { $in: ["review", "done", "rejected"] } })
      .sort({ createdAt: -1 })
      .toArray();
    const items = raw.map((t: any) => ({
      _id: t._id?.toString() || "",
      itemType: "task",
      title: t.title || "",
      description: t.description || "",
      status: t.status || "review",
      priority: t.priority || "",
      assignee: t.assignee || "",
      assigneeId: t.assigneeId || "",
      assigneeName: t.assigneeName || t.assignee || "",
      creatorName: t.creatorName || "",
      project: t.project || "",
      projectId: t.projectId || "",
      dueDate: t.dueDate ? String(t.dueDate) : "",
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
      approvedBy: t.approvedBy || "",
      approvedAt: t.approvedAt ? new Date(t.approvedAt).toISOString() : "",
      approvalNote: t.approvalNote || "",
      rejectedBy: t.rejectedBy || "",
      rejectedAt: t.rejectedAt ? new Date(t.rejectedAt).toISOString() : "",
      rejectionReason: t.rejectionReason || "",
    }));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
