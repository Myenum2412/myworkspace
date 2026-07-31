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
  if (!orgId) return NextResponse.json({ initialTasks: [], orgId: "", sessionUserId: session.user.id });
  try {
    const raw = await db.collection(collections.tasks).aggregate([
      { $match: { orgId, assigneeId: session.user.id } },
      { $sort: { createdAt: -1 } },
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
          localField: "creatorId",
          foreignField: "id",
          as: "creator",
        },
      },
      { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
    ]).toArray();

    const initialTasks = (raw as any[]).map((t) => ({
      _id: t._id?.toString() || "",
      title: t.title || "",
      description: t.description || "",
      type: t.type || "individual",
      status: t.status || "",
      priority: t.priority || "",
      project: t.project || "",
      dueDate: t.dueDate || null,
      assigneeId: t.assigneeId || "",
      assigneeName: t.assignee?.name || "",
      assigneeAvatar: t.assignee?.image || "",
      creatorId: t.creatorId || "",
      creatorName: t.creator?.name || "",
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
    }));
    return NextResponse.json({ initialTasks, orgId, sessionUserId: session.user.id });
  } catch { return NextResponse.json({ initialTasks: [], orgId, sessionUserId: session.user.id }); }
}
