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
  if (!orgId) return NextResponse.json({ overviewData: null, myTimeData: null, reportsData: null });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [entriesRaw, projectsRaw, tasksRaw] = await Promise.all([
      db.collection(collections.timeEntries).find({ orgId, userId: session.user.id, date: today }).toArray(),
      db.collection(collections.projects).find({ orgId }).sort({ createdAt: -1 }).toArray(),
      db.collection(collections.tasks).find({ orgId }).sort({ createdAt: -1 }).toArray(),
    ]);
    const entries = (entriesRaw as any[]).map((e) => ({
      id: e._id?.toString() || "", userId: e.userId || "", date: e.date || "",
      startTime: e.startTime || "", endTime: e.endTime || "", duration: e.duration || 0,
      description: e.notes || e.task || "", projectId: e.projectId || "",
      projectName: e.projectName || "", billable: e.billable || false, status: e.status || "pending",
      createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : "",
    }));
    const projects = (projectsRaw as any[]).map((p) => ({ id: p.id || "", name: p.name || "", color: p.color || "#93c5fd" }));
    const tasks = (tasksRaw as any[]).map((t) => ({ _id: t._id?.toString() || "", title: t.title || "", projectId: t.projectId || "" }));
    const myTimeData = { entries, projects, tasks, user: { name: session.user.name || "", email: session.user.email || "", avatar: session.user.image || "", id: session.user.id }, orgId };
    const overviewData = entries;
    const reportsData = null;
    return NextResponse.json({ overviewData, myTimeData, reportsData });
  } catch { return NextResponse.json({ overviewData: null, myTimeData: null, reportsData: null }); }
}
