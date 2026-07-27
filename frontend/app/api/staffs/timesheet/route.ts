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
  if (!orgId) return NextResponse.json({ projects: [], tasks: [], orgId: "", userId: session.user.id, initialTimesheet: [] });

  try {
    const [projectDocs, taskDocs, timesheetDoc] = await Promise.all([
      db.collection(collections.projects).find({ orgId }).toArray(),
      db.collection(collections.tasks).find({ orgId }).toArray(),
      db.collection("timesheets").findOne({ orgId, userId: session.user.id, week: new Date().toISOString().slice(0, 10) }),
    ]);

    const projects = projectDocs.map((p: any) => ({
      id: p.id || p._id?.toString() || "",
      name: p.name || "Unnamed Project",
      color: p.color || "#3b82f6",
    }));

    const tasks = taskDocs.map((t: any) => ({
      _id: t._id?.toString() || "",
      title: t.title || "Unnamed Task",
      projectId: t.projectId || t.project || "",
    }));

    const initialTimesheet = timesheetDoc ? (timesheetDoc as any).rows || [] : [];

    return NextResponse.json({
      projects,
      tasks,
      orgId,
      userId: session.user.id,
      initialTimesheet,
    });
  } catch (err: any) {
    console.error("Failed to load timesheet api data:", err);
    return NextResponse.json({
      projects: [],
      tasks: [],
      orgId,
      userId: session.user.id,
      initialTimesheet: [],
    });
  }
}
