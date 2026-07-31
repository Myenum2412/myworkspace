import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ revisions: [] });
  try {
    const raw = await db.collection(collections.tasks).aggregate([
      { $match: { orgId, status: { $in: ["rejected", "review"] } } },
      { $sort: { updatedAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "assigneeId",
          foreignField: "id",
          as: "assignee",
        },
      },
      { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "rejectedBy",
          foreignField: "id",
          as: "rejector",
        },
      },
      { $unwind: { path: "$rejector", preserveNullAndEmptyArrays: true } },
    ]).toArray();

    const revisions = (raw as any[]).map((t, index) => ({
      id: (index + 1),
      _id: t._id?.toString() || "",
      taskId: t._id?.toString() || "",
      description: t.title || "",
      selectedFiles: t.project || "",
      remarks: t.rejectionReason || t.approvalNote || "",
      status: t.status === "rejected" ? "InCompleted" : "InCompleted",
      assignee: t.assignee?.name || "",
      assigneeId: t.assigneeId || "",
      createdBy: t.rejector?.name || "",
      rejectedAt: t.rejectedAt || t.updatedAt || t.createdAt || null,
      dueDate: t.dueDate || null,
    }));
    return NextResponse.json({ revisions });
  } catch { return NextResponse.json({ revisions: [] }); }
}
