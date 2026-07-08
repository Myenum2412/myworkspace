import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ListTodo, CheckCircle2, Clock, AlertCircle,
  CalendarIcon, HourglassIcon, Users, FolderKanbanIcon, Building2Icon,
  IndianRupeeIcon,
} from "lucide-react";

export const revalidate = 30;

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const statusStyles: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  online: "bg-green-50 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
  offline: "bg-gray-100 text-gray-700",
  on_leave: "bg-amber-50 text-amber-700",
};

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

type DashboardData = {
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

const getCachedDashboardData = unstable_cache(
  async (orgId: string): Promise<DashboardData> => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      tCount, doneCount, ipCount, overdueCount,
      todayCount, pendingCount,
      projDocs, clientDocs,
    ] = await Promise.all([
      db.collection(collections.tasks).countDocuments({ orgId }),
      db.collection(collections.tasks).countDocuments({ orgId, status: "done" }),
      db.collection(collections.tasks).countDocuments({ orgId, status: "in_progress" }),
      db.collection(collections.tasks).countDocuments({ orgId, dueDate: { $lt: now }, status: { $ne: "done" } }),
      db.collection(collections.tasks).countDocuments({ orgId, createdAt: { $gte: todayStart } }),
      db.collection(collections.tasks).countDocuments({ orgId, status: "review" }),
      db.collection(collections.projects).find({ orgId }).sort({ createdAt: -1 }).limit(10).toArray(),
      db.collection(collections.clients).find({ orgId }).sort({ createdAt: -1 }).limit(5).toArray(),
    ]);

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
      totalTasks: tCount,
      completedTasks: doneCount,
      inProgressTasks: ipCount,
      overdueTasks: overdueCount,
      todayTasks: todayCount,
      pendingApproval: pendingCount,
      projects, members, clients, pendingInvoices,
    };
  },
  ["dashboard-data"],
  { revalidate: 30, tags: ["dashboard"] }
);

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let dashboardData: DashboardData | null = null;
  if (orgId) {
    dashboardData = await getCachedDashboardData(orgId);
  }

  const {
    totalTasks = 0, completedTasks = 0, inProgressTasks = 0, overdueTasks = 0,
    todayTasks = 0, pendingApproval = 0,
    projects = [], members = [], clients = [], pendingInvoices = [],
  } = dashboardData || {};

  const metricCards = [
    { title: "Total Task", value: totalTasks, icon: ListTodo, color: "text-muted-foreground" },
    { title: "Completed", value: completedTasks, icon: CheckCircle2, color: "text-green-600" },
    { title: "In Progress", value: inProgressTasks, icon: Clock, color: "text-blue-600" },
    { title: "Overdue", value: overdueTasks, icon: AlertCircle, color: "text-red-600" },
    { title: "Today Task", value: todayTasks, icon: CalendarIcon, color: "text-purple-600" },
    { title: "Pending Approval", value: pendingApproval, icon: HourglassIcon, color: "text-amber-600" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-2 sm:gap-3 md:gap-4 min-w-0 max-w-full">
      <h1 className="text-xl sm:text-2xl font-bold px-0.5">Dashboard Overview</h1>

      {/* Stat Cards - 1 row, 6 columns */}
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-6">
        {metricCards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{c.title}</CardTitle>
              <c.icon className={`size-3.5 sm:size-4 shrink-0 ${c.color}`} />
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="text-lg sm:text-xl md:text-2xl font-bold truncate">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tables */}
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 lg:grid-cols-6">
        {/* Active Projects */}
        <Card className="flex flex-col min-h-[250px] sm:min-h-[300px] lg:h-[320px] lg:col-span-3">
          <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <FolderKanbanIcon className="size-3.5 sm:size-4 shrink-0" /> <span className="truncate">Active Projects</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No projects yet.</p>
            ) : (
              <div className="responsive-table">
                <div className="sm:hidden space-y-2">
                  {projects.map((p) => (
                    <div key={p.id} className="border rounded-lg p-3 bg-card space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.client || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{p.progress}%</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.deadline ? new Date(p.deadline).toLocaleDateString() : "No deadline"}
                      </div>
                    </div>
                  ))}
                </div>
                <table className="table-premium hidden sm:table w-full text-sm text-left">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Client</th>
                      <th>Progress</th>
                      <th>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                        <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.client || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{p.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {p.deadline ? new Date(p.deadline).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="flex flex-col min-h-[250px] sm:min-h-[300px] lg:h-[320px] lg:col-span-3">
          <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Users className="size-3.5 sm:size-4 shrink-0" /> <span className="truncate">Team Members</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No members yet.</p>
            ) : (
              <div className="responsive-table">
                <div className="sm:hidden space-y-2">
                  {members.map((m) => (
                    <div key={m.email} className="border rounded-lg p-3 bg-card flex items-center gap-3">
                      <Avatar className="size-10 shrink-0">
                        <AvatarImage src={m.avatar} alt={m.name} />
                        <AvatarFallback>{getInitials(m.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs capitalize text-muted-foreground">{m.role}</span>
                          <Badge className={statusStyles[m.status] || ""}>{m.status.replace(/_/g, " ")}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <table className="table-premium hidden sm:table w-full text-sm text-left">
                  <thead>
                    <tr><th>Name</th><th>Role</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.email} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarImage src={m.avatar} alt={m.name} />
                              <AvatarFallback>{getInitials(m.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{m.name}</p>
                              <p className="text-xs text-muted-foreground">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">{m.role}</td>
                        <td className="px-4 py-3">
                          <Badge className={statusStyles[m.status] || ""}>{m.status.replace(/_/g, " ")}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="flex flex-col min-h-[250px] sm:min-h-[300px] lg:h-[320px] lg:col-span-3">
          <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Building2Icon className="size-3.5 sm:size-4 shrink-0" /> <span className="truncate">Recent Clients</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No clients yet.</p>
            ) : (
              <div className="responsive-table">
                <div className="sm:hidden space-y-2">
                  {clients.map((c) => (
                    <div key={c.id} className="border rounded-lg p-3 bg-card space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{c.name}</span>
                        <Badge variant="secondary" className="text-xs">{c.status || "Lead"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.company || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                  ))}
                </div>
                <table className="table-premium hidden sm:table w-full text-sm text-left">
                  <thead>
                    <tr><th>Name</th><th>Company</th><th>Email</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                        <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{c.company || "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{c.email}</td>
                        <td className="px-4 py-3"><Badge variant="secondary">{c.status || "Lead"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments */}
      <Card>
        <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <IndianRupeeIcon className="size-3.5 sm:size-4 shrink-0" /> <span className="truncate">Pending Payments</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {pendingInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pending payments.</p>
          ) : (
            <div className="responsive-table">
              <div className="sm:hidden space-y-2">
                {pendingInvoices.map((inv) => (
                  <div key={inv.id} className="border rounded-lg p-3 bg-card space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Invoice #{inv.number || inv.id.slice(0, 8)}</span>
                      <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">Pending</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{inv.customerName || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}
                    </p>
                    <p className="text-sm font-semibold text-amber-600">
                      ₹{(inv.amountPaid / 100).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              <table className="table-premium hidden sm:table w-full text-sm text-left">
                <thead>
                  <tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {pendingInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                      <td className="px-4 py-3 text-sm font-medium">#{inv.number || inv.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{inv.customerName || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-amber-600">
                        ₹{(inv.amountPaid / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">Pending</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
