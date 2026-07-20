import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { DashboardClient } from "./dashboard-client";

export const revalidate = 30;

export type DashboardData = {
  totalTasks: number; completedTasks: number; inProgressTasks: number;
  overdueTasks: number; todayTasks: number; pendingApproval: number;
  projects: { id: string; name: string; client: string; status: string; progress: number; deadline: string | null; }[];
  members: { name: string; email: string; role: string; status: string; avatar: string; }[];
  clients: { id: string; name: string; company: string; email: string; status: string; }[];
  pendingInvoices: { id: string; number: string; amountPaid: number; currency: string; status: string; createdAt: string; customerName: string; }[];
};

export type ReportsData = {
  total: number; completed: number; inProgress: number; overdue: number;
  priorityBreakdown: { label: string; count: number; color: string }[];
  statusBreakdown: { label: string; count: number; color: string }[];
};

const getCachedDashboardData = unstable_cache(
  async (orgId: string): Promise<DashboardData> => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const pipeline = [
      { $match: { orgId } },
      { $group: {
          _id: null,
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $and: [{ $lt: ["$dueDate", now] }, { $ne: ["$status", "done"] }] }, 1, 0] } },
          today: { $sum: { $cond: [{ $gte: ["$createdAt", todayStart] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ["$status", "review"] }, 1, 0] } },
        },
      },
    ] as const;

    const [taskCounts, projDocs, clientDocs, orgMemberDocs, invoiceDocs] = await Promise.all([
      db.collection(collections.tasks).aggregate(pipeline as any).toArray(),
      db.collection(collections.projects).find({ orgId }).sort({ createdAt: -1 }).limit(10).project({ id: 1, name: 1, client: 1, status: 1, progress: 1, dueDate: 1, deadline: 1 }).toArray(),
      db.collection(collections.clients).find({ orgId }).sort({ createdAt: -1 }).limit(5).project({ id: 1, name: 1, company: 1, email: 1, status: 1 }).toArray(),
      db.collection(collections.orgMembers).find({ orgId }).project({ userId: 1, role: 1 }).toArray(),
      db.collection(collections.invoices).find({ orgId, status: "open" }).sort({ createdAt: -1 }).limit(10).project({ id: 1, number: 1, amountPaid: 1, currency: 1, status: 1, createdAt: 1, customerName: 1 }).toArray(),
    ]);

    const counts = (taskCounts as any)[0] || { total: 0, done: 0, inProgress: 0, overdue: 0, today: 0, review: 0 };

    const userIds = (orgMemberDocs as any[]).map((m: any) => m.userId).filter(Boolean);
    let userDocs: any[] = [];
    if (userIds.length > 0) {
      userDocs = await db.collection(collections.users).find({ id: { $in: userIds } }).project({ id: 1, name: 1, email: 1, image: 1, status: 1 }).toArray() as any;
    }
    const userMap = new Map(userDocs.map((u: any) => [u.id, u]));

    const projects = (projDocs as any[]).map((p: any) => ({
      id: p.id || String(p._id || ""),
      name: p.name || "",
      client: p.client || "",
      status: p.status || "Active",
      progress: Number(p.progress ?? 0),
      deadline: p.dueDate || p.deadline || null,
    }));

    const clients = (clientDocs as any[]).map((c: any) => ({
      id: c.id || String(c._id || ""),
      name: c.name || "",
      company: c.company || "",
      email: c.email || "",
      status: c.status || "",
    }));

    const members = (orgMemberDocs as any[]).map((m: any) => {
      const u = userMap.get(m.userId);
      return {
        name: u?.name || "Unknown",
        email: u?.email || "",
        role: m.role || "staffs",
        status: u?.status || "offline",
        avatar: u?.image || "",
      };
    });

    const pendingInvoices = (invoiceDocs as any[]).map((inv: any) => ({
      id: inv.id || String(inv._id || ""),
      number: inv.number || "",
      amountPaid: inv.amountPaid || 0,
      currency: inv.currency || "inr",
      status: inv.status || "open",
      createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : "",
      customerName: inv.customerName || "",
    }));

    return {
      totalTasks: counts.total, completedTasks: counts.done,
      inProgressTasks: counts.inProgress, overdueTasks: counts.overdue,
      todayTasks: counts.today, pendingApproval: counts.review,
      projects, members, clients, pendingInvoices,
    };
  },
  ["dashboard-data-v2"],
  { revalidate: 30, tags: ["dashboard"] }
);

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
  ["reports-data-v2"],
  { revalidate: 30, tags: ["dashboard"] }
);

export default async function DashboardPage() {
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

  let dashboardData: DashboardData | null = null;
  let reportsData: ReportsData | null = null;

  if (orgId) {
    try {
      [dashboardData, reportsData] = await Promise.all([
        getCachedDashboardData(orgId),
        getCachedReportsData(orgId),
      ]);
    } catch {}
  }

  return <DashboardClient dashboardData={dashboardData} reportsData={reportsData} />;
}
