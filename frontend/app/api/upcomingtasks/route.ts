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
  if (!orgId) return NextResponse.json({ initialTasks: [], overdueTasks: [] });
  try {
    const now = new Date();
    const [tasksRaw, overdueRaw] = await Promise.all([
      db.collection(collections.tasks).find({ orgId, dueDate: { $gte: now }, status: { $nin: ["done", "cancelled", "completed", "closed", "rejected"] } }).sort({ dueDate: 1 }).toArray(),
      db.collection(collections.tasks).find({
        orgId, dueDate: { $lt: now },
        status: { $nin: ["done", "cancelled", "completed", "closed", "rejected"] },
      }).project({ title: 1, dueDate: 1 }).sort({ dueDate: 1 }).limit(10).toArray(),
    ]);
    const initialTasks = (tasksRaw as any[]).map((t) => ({
      _id: t._id?.toString() || "", title: t.title || "", status: t.status || "", priority: t.priority || "",
      dueDate: t.dueDate || null, assignee: t.assignee || "", createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
    }));
    const overdueTasks = (overdueRaw as any[]).map((t) => ({
      _id: t._id?.toString() || "", title: t.title || "",
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
    }));
    return NextResponse.json({ initialTasks, overdueTasks });
  } catch { return NextResponse.json({ initialTasks: [], overdueTasks: [] }); }
}
