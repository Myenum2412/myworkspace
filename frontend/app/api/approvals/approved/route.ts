import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ tasks: [] });
  try {
    const raw = await db
      .collection(collections.tasks)
      .find({ orgId, status: { $in: ["done", "approved", "completed"] } })
      .sort({ createdAt: -1 })
      .toArray();
    const tasks = raw.map((t: Record<string, unknown>) => ({
      _id: String(t._id || ""),
      title: String(t.title || ""),
      status: String(t.status || ""),
      priority: String(t.priority || ""),
      assignee: String(t.assignee || ""),
      project: String(t.project || ""),
      dueDate: t.dueDate ? String(t.dueDate) : null,
      createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
    }));
    return NextResponse.json({ tasks });
  } catch {
    return NextResponse.json({ tasks: [] });
  }
}
