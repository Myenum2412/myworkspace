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
  if (!orgId) return NextResponse.json({ entries: [] });
  try {
    const raw = await db.collection(collections.timeEntries).find({ orgId }).sort({ date: -1 }).toArray();
    const entries = (raw as any[]).map((e) => ({
      _id: e._id?.toString() || "", userId: e.userId || "", projectId: e.projectId || "",
      projectName: e.projectName || "", task: e.task || "", duration: e.duration || 0, date: e.date || "",
    }));
    return NextResponse.json({ entries });
  } catch { return NextResponse.json({ entries: [] }); }
}
