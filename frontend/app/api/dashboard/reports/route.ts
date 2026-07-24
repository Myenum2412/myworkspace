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
  if (!orgId) return NextResponse.json({ reportsData: null });
  try {
    const raw = await db.collection(collections.tasks).find({ orgId }).toArray();
    const tasks = raw as any[];
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length;

    const priorityMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    for (const t of tasks) {
      const p = t.priority || "medium";
      priorityMap.set(p, (priorityMap.get(p) || 0) + 1);
      const s = t.status || "pending";
      statusMap.set(s, (statusMap.get(s) || 0) + 1);
    }

    const priorityColors: Record<string, string> = { urgent: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
    const priorityBreakdown = Array.from(priorityMap.entries()).map(([label, count]) => ({ label, count, color: priorityColors[label] || "#6b7280" }));
    const statusBreakdown = Array.from(statusMap.entries()).map(([label, count]) => ({ label, count, color: "#3b82f6" }));

    return NextResponse.json({ reportsData: { total, completed, inProgress, overdue, priorityBreakdown, statusBreakdown } });
  } catch { return NextResponse.json({ reportsData: null }); }
}
