import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { ReportsData } from "../page";
import { DashboardReportsClient } from "../dashboard-reports-client";

export const revalidate = 30;

const getCachedReportsData = unstable_cache(
  async (orgId: string): Promise<ReportsData> => {
    const now = new Date();
    const allTasks = await db.collection(collections.tasks)
      .find({ orgId })
      .project({ title: 1, status: 1, priority: 1, dueDate: 1 })
      .toArray();

    const tasks = (allTasks as any[]).map((t: any) => ({
      status: t.status || "",
      priority: t.priority || "",
      dueDate: t.dueDate || undefined,
    }));

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done" && t.status !== "cancelled").length;

    const priorityLabels = ["urgent", "high", "medium", "low"] as const;
    const priorityColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-gray-400"];

    const priorityBreakdown = priorityLabels.map((label, i) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      count: tasks.filter((t) => t.priority === label).length,
      color: priorityColors[i],
    }));

    const statusConfig = [
      { label: "To Do", status: "todo", color: "bg-gray-400" },
      { label: "In Progress", status: "in_progress", color: "bg-blue-500" },
      { label: "Review", status: "review", color: "bg-purple-500" },
      { label: "Done", status: "done", color: "bg-green-500" },
      { label: "Cancelled", status: "cancelled", color: "bg-red-500" },
    ];

    const statusBreakdown = statusConfig.map((cfg) => ({
      ...cfg,
      count: cfg.status === "in_progress" ? inProgress : cfg.status === "done" ? completed : tasks.filter((t) => t.status === cfg.status).length,
    }));

    statusBreakdown.push({ label: "Overdue", status: "overdue", count: overdue, color: "bg-red-500" });

    return { total, completed, inProgress, overdue, priorityBreakdown, statusBreakdown };
  },
  ["reports-data-v3"],
  { revalidate: 30, tags: ["dashboard"] }
);

export default async function ReportsPage() {
  let session;
  try {
    session = await auth();
    if (!session?.user?.id) redirect("/login");
  } catch {
    redirect("/login");
  }

  let orgId: string | null = null;
  try {
    orgId = await getUserOrgId(session.user.id, session.user.email);
  } catch {}

  let reportsData: ReportsData | null = null;

  if (orgId) {
    try {
      [reportsData] = await Promise.all([
        getCachedReportsData(orgId),
      ]);
    } catch {}
  }

  return <DashboardReportsClient reportsData={reportsData} />;
}
