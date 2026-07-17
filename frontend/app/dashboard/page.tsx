import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { DashboardClient } from "./dashboard-client";

export const revalidate = 30;

type Project = {
  id: string;
  name: string;
  client: string;
  status: string;
  progress: number;
  deadline: string | null;
};

type Member = {
  name: string;
  email: string;
  role: string;
  status: string;
  avatar: string;
};

type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  status: string;
};

type Invoice = {
  id: string;
  number: string;
  amountPaid: number;
  currency: string;
  status: string;
  createdAt: string;
  customerName: string;
};

export type DashboardData = {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  todayTasks: number;
  pendingApproval: number;
  projects: Project[];
  members: Member[];
  clients: Client[];
  pendingInvoices: Invoice[];
};

export type ReportsData = {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  priorityBreakdown: { label: string; count: number; color: string }[];
  statusBreakdown: { label: string; count: number; color: string }[];
};

const getCachedDashboardData = unstable_cache(
  async (orgId: string): Promise<DashboardData> => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      taskCounts, projDocs, clientDocs,
    ] = await Promise.all([
      // Single aggregation instead of 6 separate countDocuments
      db.collection(collections.tasks).aggregate([
        { $match: { orgId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
            overdue: { $sum: { $cond: [{ $and: [{ $lt: ["$dueDate", now] }, { $ne: ["$status", "done"] }] }, 1, 0] } },
            today: { $sum: { $cond: [{ $gte: ["$createdAt", todayStart] }, 1, 0] } },
            review: { $sum: { $cond: [{ $eq: ["$status", "review"] }, 1, 0] } },
          },
        },
      ]).toArray(),
      db.collection(collections.projects).find({ orgId }).sort({ createdAt: -1 }).limit(10).toArray(),
      db.collection(collections.clients).find({ orgId }).sort({ createdAt: -1 }).limit(5).toArray(),
    ]);

    const counts = (taskCounts as any)[0] || { total: 0, done: 0, inProgress: 0, overdue: 0, today: 0, review: 0 };

    const projects: Project[] = (projDocs as unknown as Record<string, unknown>[]).map((p) => ({
      id: (p.id as string) || String(p._id || ""),
      name: (p.name as string) || "",
      client: (p.client as string) || "",
      status: (p.status as string) || "Active",
      progress: Number(p.progress ?? 0),
      deadline: (p.dueDate as string) || (p.deadline as string) || null,
    }));

    const clients: Client[] = (clientDocs as unknown as Record<string, unknown>[]).map((c) => ({
      id: (c.id as string) || "",
      name: (c.name as string) || "",
      company: (c.company as string) || "",
      email: (c.email as string) || "",
      status: (c.status as string) || "",
    }));

    const orgMemberDocs = await db.collection(collections.orgMembers).find({ orgId }).toArray();
    const userIds = (orgMemberDocs as unknown as Record<string, unknown>[]).map((m) => m.userId as string).filter(Boolean);
    let members: Member[] = [];
    if (userIds.length > 0) {
      const userDocs = await db.collection(collections.users).find({ id: { $in: userIds } }).project({ id: 1, name: 1, email: 1, image: 1, status: 1 }).toArray();
      const userMap = new Map((userDocs as unknown as Record<string, unknown>[]).map((u) => [u.id, u]));
      members = (orgMemberDocs as unknown as Record<string, unknown>[]).map((m) => {
        const u = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
        return {
          name: (u?.name as string) || "Unknown",
          email: (u?.email as string) || "",
          role: (m.role as string) || "member",
          status: (u?.status as string) || "offline",
          avatar: (u?.image as string) || "",
        };
      });
    }

    const invoiceDocs = await db.collection(collections.invoices)
      .find({ orgId, status: "open" })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const pendingInvoices: Invoice[] = (invoiceDocs as unknown as Record<string, unknown>[]).map((inv) => ({
      id: (inv.id as string) || String(inv._id || ""),
      number: (inv.number as string) || "",
      amountPaid: (inv.amountPaid as number) || 0,
      currency: (inv.currency as string) || "inr",
      status: (inv.status as string) || "open",
      createdAt: inv.createdAt ? new Date(inv.createdAt as string).toISOString() : "",
      customerName: (inv.customerName as string) || "",
    }));

    return {
      totalTasks: counts.total,
      completedTasks: counts.done,
      inProgressTasks: counts.inProgress,
      overdueTasks: counts.overdue,
      todayTasks: counts.today,
      pendingApproval: counts.review,
      projects, members, clients, pendingInvoices,
    };
  },
  ["dashboard-data"],
  { revalidate: 30, tags: ["dashboard"] }
);

export default async function DashboardPage() {
  let session;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }
  if (!session?.user?.id) redirect("/login");

  let orgId: string | null = null;
  try {
    orgId = await getUserOrgId(session.user.id, session.user.email);
  } catch {
    // org lookup failed; proceed with defaults
  }

  let dashboardData: DashboardData | null = null;
  let reportsData: ReportsData | null = null;
  if (orgId) {
    try {
      dashboardData = await getCachedDashboardData(orgId);

      const rawTasks = await db.collection(collections.tasks).find({ orgId }).toArray();
      const tasks = (rawTasks as unknown as Record<string, unknown>[]).map((t) => ({
        title: (t.title as string) || "",
        status: (t.status as string) || "",
        priority: (t.priority as string) || "",
        dueDate: (t.dueDate as string) || undefined,
      }));

      const rTotal = tasks.length;
      const rCompleted = tasks.filter((t) => t.status === "done").length;
      const rInProgress = tasks.filter((t) => t.status === "in_progress").length;
      const rOverdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done" && t.status !== "cancelled").length;

      reportsData = {
        total: rTotal,
        completed: rCompleted,
        inProgress: rInProgress,
        overdue: rOverdue,
        priorityBreakdown: [
          { label: "Urgent", count: tasks.filter((t) => t.priority === "urgent").length, color: "bg-red-500" },
          { label: "High", count: tasks.filter((t) => t.priority === "high").length, color: "bg-orange-500" },
          { label: "Medium", count: tasks.filter((t) => t.priority === "medium").length, color: "bg-yellow-500" },
          { label: "Low", count: tasks.filter((t) => t.priority === "low").length, color: "bg-gray-400" },
        ],
        statusBreakdown: [
          { label: "To Do", count: tasks.filter((t) => t.status === "todo").length, color: "bg-gray-400" },
          { label: "In Progress", count: rInProgress, color: "bg-blue-500" },
          { label: "Review", count: tasks.filter((t) => t.status === "review").length, color: "bg-purple-500" },
          { label: "Done", count: rCompleted, color: "bg-green-500" },
          { label: "Cancelled", count: tasks.filter((t) => t.status === "cancelled").length, color: "bg-red-500" },
          { label: "Overdue", count: rOverdue, color: "bg-red-500" },
        ],
      };
    } catch {
      // data unavailable; render with defaults
    }
  }

  return (
    <DashboardClient dashboardData={dashboardData} reportsData={reportsData} />
  );
}
