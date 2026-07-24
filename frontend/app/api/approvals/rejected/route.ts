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
  if (!orgId) return NextResponse.json({ tasks: [] });
  try {
    const raw = await db.collection(collections.tasks).find({ orgId, status: "rejected" }).sort({ createdAt: -1 }).toArray();
    const tasks = (raw as any[]).map((t) => ({
      _id: t._id?.toString() || "", title: t.title || "", status: t.status || "", priority: t.priority || "",
      assignee: t.assignee || "", project: t.project || "", dueDate: t.dueDate || null,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
    }));
    return NextResponse.json({ tasks });
  } catch { return NextResponse.json({ tasks: [] }); }
}
