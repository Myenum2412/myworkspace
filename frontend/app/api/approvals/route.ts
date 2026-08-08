import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ items: [] });
  try {
    const raw = await db
      .collection(collections.tasks)
      .find({
        orgId,
        status: {
          $in: [
            "pending",
            "review",
            "submitted",
            "approved",
            "completed",
            "done",
            "rejected",
            "cancelled",
          ],
        },
      })
      .sort({ createdAt: -1 })
      .toArray();
    interface TaskDoc {
      _id?: unknown;
      assigneeId?: unknown;
      assignee?: unknown;
      creatorId?: unknown;
      createdBy?: unknown;
      approvedBy?: unknown;
      approvedByName?: unknown;
      rejectedBy?: unknown;
      rejectedByName?: unknown;
      title?: unknown;
      description?: unknown;
      status?: unknown;
      priority?: unknown;
      assigneeName?: unknown;
      creatorName?: unknown;
      project?: unknown;
      projectId?: unknown;
      dueDate?: unknown;
      createdAt?: unknown;
      approvedAt?: unknown;
      approvalNote?: unknown;
      rejectedAt?: unknown;
      rejectionReason?: unknown;
    }
    const userIds = [
      ...new Set(
        raw.flatMap((t: TaskDoc) =>
          [
            t.assigneeId,
            t.assignee,
            t.creatorId,
            t.createdBy,
            t.approvedBy,
            t.approvedByName,
            t.rejectedBy,
            t.rejectedByName,
          ].filter((v): v is string => typeof v === "string" && v.length > 0),
        ),
      ),
    ];
    const userDocs =
      userIds.length > 0
        ? await db
            .collection(collections.users)
            .find({ id: { $in: userIds } })
            .toArray()
        : [];
    const userMap = new Map(
      userDocs.map((u) => [u.id, { name: u.name || u.email || "", image: u.image || "" }]),
    );
    const items = raw.map((rawT: TaskDoc) => {
      const t = rawT;
      const assignee =
        userMap.get(String(t.assigneeId || t.assignee || "")) ||
        userMap.get(String(t.assignee || t.assigneeId || ""));
      const creator = userMap.get(String(t.creatorId || t.createdBy || ""));
      const approvedByUser =
        userMap.get(String(t.approvedBy || "")) || userMap.get(String(t.approvedByName || ""));
      const rejectedByUser =
        userMap.get(String(t.rejectedBy || "")) || userMap.get(String(t.rejectedByName || ""));
      return {
        _id: String(t._id || ""),
        itemType: "task",
        title: String(t.title || ""),
        description: String(t.description || ""),
        status: String(t.status || "review"),
        priority: String(t.priority || ""),
        assignee: String(t.assignee || ""),
        assigneeId: String(t.assigneeId || ""),
        assigneeName: String(t.assigneeName || assignee?.name || t.assignee || ""),
        assigneeAvatar: assignee?.image || "",
        creatorId: String(t.creatorId || ""),
        creatorName: String(t.creatorName || creator?.name || ""),
        creatorAvatar: creator?.image || "",
        project: String(t.project || ""),
        projectId: String(t.projectId || ""),
        dueDate: t.dueDate ? String(t.dueDate) : "",
        createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
        approvedBy: String(t.approvedBy || ""),
        approvedByName: approvedByUser?.name || String(t.approvedByName || ""),
        approvedByAvatar: approvedByUser?.image || "",
        approvedAt: t.approvedAt ? new Date(t.approvedAt as string).toISOString() : "",
        approvalNote: String(t.approvalNote || ""),
        rejectedBy: String(t.rejectedBy || ""),
        rejectedByName: rejectedByUser?.name || String(t.rejectedByName || ""),
        rejectedByAvatar: rejectedByUser?.image || "",
        rejectedAt: t.rejectedAt ? new Date(t.rejectedAt as string).toISOString() : "",
        rejectionReason: String(t.rejectionReason || ""),
      };
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
