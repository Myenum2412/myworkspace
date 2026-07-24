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
  if (!orgId) return NextResponse.json({ org: null, stats: {} });
  try {
    const org = await db.collection(collections.organizations).findOne({ id: orgId }) as any;
    const [memberCount, projectCount, taskCount] = await Promise.all([
      db.collection(collections.orgMembers).find({ orgId }).count(),
      db.collection(collections.projects).find({ orgId }).count(),
      db.collection(collections.tasks).find({ orgId }).count(),
    ]);
    return NextResponse.json({
      org: org ? { id: org.id || org._id?.toString() || "", name: org.name || "", description: org.description || "", createdAt: org.createdAt } : null,
      stats: { members: memberCount, projects: projectCount, tasks: taskCount },
    });
  } catch { return NextResponse.json({ org: null, stats: {} }); }
}
