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
  if (!orgId) return NextResponse.json({ org: null, members: [], stats: { totalMembers: 0, activeProjects: 0, pendingTasks: 0 } });
  try {
    const [org, members, projects, tasks] = await Promise.all([
      db.collection(collections.organizations).findOne({ id: orgId }) as any,
      db.collection(collections.orgMembers).find({ orgId }).toArray(),
      db.collection(collections.projects).find({ orgId, status: "Active" }).count(),
      db.collection(collections.tasks).find({ orgId, status: { $nin: ["done", "cancelled"] } }).count(),
    ]);
    return NextResponse.json({
      org: org ? { id: org.id || org._id?.toString() || "", name: org.name || "", description: org.description || "" } : null,
      members: (members as any[]).length,
      stats: { totalMembers: (members as any[]).length, activeProjects: projects, pendingTasks: tasks },
    });
  } catch { return NextResponse.json({ org: null, members: [], stats: { totalMembers: 0, activeProjects: 0, pendingTasks: 0 } }); }
}
