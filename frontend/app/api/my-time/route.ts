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
  if (!orgId) return NextResponse.json({ initialEntries: [], projects: [], user: session.user, orgId: "" });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [entriesRaw, projectsRaw] = await Promise.all([
      db.collection(collections.timeEntries).find({ orgId, userId: session.user.id, date: today }).toArray(),
      db.collection(collections.projects).find({ orgId }).sort({ createdAt: -1 }).toArray(),
    ]);
    const initialEntries = (entriesRaw as any[]).map((e) => ({
      _id: e._id?.toString() || "", projectId: e.projectId || "", projectName: e.projectName || "",
      task: e.task || "", startTime: e.startTime || "", endTime: e.endTime || "",
      duration: e.duration || 0, date: e.date || "", notes: e.notes || "",
    }));
    const projects = (projectsRaw as any[]).map((p) => ({ id: p.id || "", name: p.name || "" }));
    return NextResponse.json({ initialEntries, projects, user: { name: session.user.name, email: session.user.email, avatar: session.user.image, id: session.user.id }, orgId });
  } catch { return NextResponse.json({ initialEntries: [], projects: [], user: session.user, orgId }); }
}
