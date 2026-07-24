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
  if (!orgId) return NextResponse.json({ overviewTasks: [], currentUserId: "", teamTasks: [], allTasks: [], orgId: "", myTasks: [], userId: "", savedTasks: [], upcomingTasks: [] });
  try {
    const userId = session.user.id;
    const now = new Date();
    const [tasksRaw, teamTasksRaw, myTasksRaw, savedTasksRaw, upcomingRaw] = await Promise.all([
      db.collection(collections.tasks).find({ orgId }).sort({ createdAt: -1 }).limit(10).toArray(),
      db.collection(collections.tasks).find({ orgId }).sort({ createdAt: -1 }).limit(10).toArray(),
      db.collection(collections.tasks).find({ orgId, assignee: userId }).sort({ createdAt: -1 }).limit(10).toArray(),
      db.collection(collections.tasks).find({ orgId, savedBy: userId }).sort({ createdAt: -1 }).limit(10).toArray(),
      db.collection(collections.tasks).find({ orgId, dueDate: { $gte: now }, status: { $nin: ["done", "cancelled"] } }).sort({ dueDate: 1 }).limit(10).toArray(),
    ]);
    const mapTask = (t: any) => ({ _id: t._id?.toString() || "", title: t.title || "", status: t.status || "", priority: t.priority || "", dueDate: t.dueDate || null, assignee: t.assignee || "", createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "" });
    return NextResponse.json({
      overviewTasks: (tasksRaw as any[]).map(mapTask),
      currentUserId: userId,
      teamTasks: (teamTasksRaw as any[]).map(mapTask),
      allTasks: (tasksRaw as any[]).map(mapTask),
      orgId,
      myTasks: (myTasksRaw as any[]).map(mapTask),
      userId,
      savedTasks: (savedTasksRaw as any[]).map(mapTask),
      upcomingTasks: (upcomingRaw as any[]).map(mapTask),
    });
  } catch { return NextResponse.json({ overviewTasks: [], currentUserId: "", teamTasks: [], allTasks: [], orgId: "", myTasks: [], userId: "", savedTasks: [], upcomingTasks: [] }); }
}
