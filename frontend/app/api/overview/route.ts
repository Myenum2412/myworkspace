import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

function buildTaskLookupPipeline(match: Record<string, any>, sort: Record<string, any>, limit: number) {
  return [
    { $match: match },
    { $sort: sort },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "assigneeId",
        foreignField: "id",
        as: "assignee",
        pipeline: [{ $project: { _id: 1, name: 1, image: 1 } }],
      },
    },
    { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "creatorId",
        foreignField: "id",
        as: "creator",
        pipeline: [{ $project: { _id: 1, name: 1 } }],
      },
    },
    { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "teams",
        let: { tid: "$teamId" },
        pipeline: [
          { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$tid"] } } },
          { $project: { _id: 1, name: 1 } },
        ],
        as: "team",
      },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        title: 1,
        description: { $ifNull: ["$description", ""] },
        status: 1,
        priority: 1,
        dueDate: 1,
        assigneeId: 1,
        assigneeName: { $ifNull: ["$assignee.name", ""] },
        assigneeAvatar: { $ifNull: ["$assignee.image", ""] },
        creatorId: 1,
        creatorName: { $ifNull: ["$creator.name", ""] },
        createdAt: 1,
        isSaved: { $ifNull: ["$isSaved", false] },
        teamId: 1,
        teamName: { $ifNull: ["$team.name", ""] },
      },
    },
  ];
}

const mapTask = (t: any) => ({
  _id: t._id?.toString() || "",
  title: t.title || "",
  description: t.description || "",
  status: t.status || "",
  priority: t.priority || "",
  dueDate: t.dueDate || null,
  assigneeId: t.assigneeId || "",
  assigneeName: t.assigneeName || "",
  assigneeAvatar: t.assigneeAvatar || "",
  creatorId: t.creatorId || "",
  creatorName: t.creatorName || "",
  createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
  isSaved: t.isSaved ?? false,
  teamId: t.teamId || "",
  teamName: t.teamName || "",
});

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ overviewTasks: [], currentUserId: "", teamTasks: [], allTasks: [], orgId: "", myTasks: [], userId: "", upcomingTasks: [] });
  try {
    const userId = session.user.id;
    const now = new Date();
    const coll = db.collection(collections.tasks);
    const [tasksRaw, teamTasksRaw, myTasksRaw, upcomingRaw] = await Promise.all([
      coll.aggregate(buildTaskLookupPipeline({ orgId }, { createdAt: -1 }, 10)).toArray(),
      coll.aggregate(buildTaskLookupPipeline({ orgId, teamId: { $exists: true, $nin: [null, ""] } }, { createdAt: -1 }, 50)).toArray(),
      coll.aggregate(buildTaskLookupPipeline({ orgId, assigneeId: userId }, { createdAt: -1 }, 10)).toArray(),
      coll.aggregate(buildTaskLookupPipeline({ orgId, dueDate: { $gte: now }, status: { $nin: ["done", "cancelled"] } }, { dueDate: 1 }, 10)).toArray(),
    ]);
    return NextResponse.json({
      overviewTasks: tasksRaw.map(mapTask),
      currentUserId: userId,
      teamTasks: teamTasksRaw.map(mapTask),
      allTasks: tasksRaw.map(mapTask),
      orgId,
      myTasks: myTasksRaw.map(mapTask),
      userId,
      upcomingTasks: upcomingRaw.map(mapTask),
    });
  } catch { return NextResponse.json({ overviewTasks: [], currentUserId: "", teamTasks: [], allTasks: [], orgId: "", myTasks: [], userId: "", upcomingTasks: [] }); }
}
