import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import dynamic from "next/dynamic";
import {
  ListTodo, CheckCircle2, Clock, AlertCircle, Users,
  FolderKanbanIcon, BriefcaseIcon, Building2Icon, HardDriveIcon,
  MessageSquareReply,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProfitLossRow } from "@/components/dashboard/profit-loss-chart";

const ProfitLossChart = dynamic(() => import("@/components/dashboard/profit-loss-chart").then(m => ({ default: m.ProfitLossChart })), {
  loading: () => <Skeleton className="h-[250px] sm:h-[350px] lg:h-[400px] w-full rounded-lg" />,
});
const PriorityBreakdownChart = dynamic(() => import("@/components/dashboard/priority-breakdown-chart").then(m => ({ default: m.PriorityBreakdownChart })), {
  loading: () => <Skeleton className="h-[250px] sm:h-[350px] lg:h-[400px] w-full rounded-lg" />,
});

export const revalidate = 30;

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const statusStyles: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  online: "bg-green-50 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
  offline: "bg-gray-100 text-gray-700",
  on_leave: "bg-amber-50 text-amber-700",
  break: "bg-gray-200 text-gray-700",
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-200 text-gray-800",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const taskStatusStyles: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

type Task = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeName: string;
  assigneeAvatar: string;
  createdAt: string;
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

type ActivityItem = {
  _id: string;
  action: string;
  description: string;
  createdAt: string;
};

type RecentComment = {
  _id: string;
  content: string;
  taskTitle: string;
  taskId: string;
  senderName: string;
  senderAvatar: string;
  createdAt: string;
};

type DashboardData = {
  totalTasks: number; completedTasks: number; inProgressTasks: number; overdueTasks: number;
  activeMembers: number; recentActivity: number; totalProjects: number; activeProjects: number;
  totalClients: number; totalTeams: number;
  tasks: Task[]; projects: Project[]; clients: Client[]; activities: ActivityItem[]; members: Member[];
  priorityBreakdown: { name: string; value: number }[];
  recentComments: RecentComment[];
};

const getCachedDashboardData = unstable_cache(
  async (orgId: string): Promise<DashboardData> => {
    const oneDayAgo = new Date(Date.now() - 86400000);
    const now = new Date();

    const [
      tCount, doneCount, ipCount, overdueCount,
      memberCount, activityCount,
      projCount, activeProjCount,
      clientCount, teamCount,
      priorityDocs,
      taskDocs, projDocs, clientDocs,
      activityDocs,
      commentDocs,
    ] = await Promise.all([
      db.collection(collections.tasks).countDocuments({ orgId }),
      db.collection(collections.tasks).countDocuments({ orgId, status: "done" }),
      db.collection(collections.tasks).countDocuments({ orgId, status: "in_progress" }),
      db.collection(collections.tasks).countDocuments({ orgId, dueDate: { $lt: now }, status: { $ne: "done" } }),
      db.collection(collections.orgMembers).countDocuments({ orgId }),
      db.collection(collections.activityLogs).countDocuments({ orgId, createdAt: { $gt: oneDayAgo } }),
      db.collection(collections.projects).countDocuments({ orgId }),
      db.collection(collections.projects).countDocuments({ orgId, status: "Active" }),
      db.collection(collections.clients).countDocuments({ orgId }),
      db.collection(collections.teams).countDocuments({ orgId }),
      db.collection(collections.tasks).aggregate([
        { $match: { orgId } },
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ]).toArray(),
      db.collection(collections.tasks).aggregate([
        { $match: { orgId } },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "assigneeId",
            foreignField: "id",
            as: "assignee",
            pipeline: [{ $project: { _id: 0, name: 1, image: 1 } }],
          },
        },
        { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
      ]).toArray(),
      db.collection(collections.projects).find({ orgId }).sort({ createdAt: -1 }).limit(10).toArray(),
      db.collection(collections.clients).find({ orgId }).sort({ createdAt: -1 }).limit(5).toArray(),
      db.collection(collections.activityLogs).find({ orgId }).sort({ createdAt: -1 }).limit(20).toArray(),
      db.collection(collections.taskComments).aggregate([
        { $match: { orgId } },
        { $sort: { createdAt: -1 } },
        { $limit: 15 },
        {
          $lookup: {
            from: "tasks",
            localField: "taskId",
            foreignField: "id",
            as: "task",
            pipeline: [{ $project: { _id: 0, id: 1, title: 1 } }],
          },
        },
        { $unwind: { path: "$task", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "senderId",
            foreignField: "id",
            as: "sender",
            pipeline: [{ $project: { _id: 0, name: 1, image: 1 } }],
          },
        },
        { $unwind: { path: "$sender", preserveNullAndEmptyArrays: true } },
      ]).toArray(),
    ]);

    const tasks: Task[] = (taskDocs as unknown as Record<string, unknown>[]).map((t) => {
      const assignee = (t.assignee as Record<string, unknown> | null) || null;
      return {
      _id: (t._id as { toString: () => string }).toString(),
      title: (t.title as string) || "",
      status: (t.status as string) || "todo",
      priority: (t.priority as string) || "medium",
      dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
      assigneeName: (assignee?.name as string) || (t.assigneeName as string) || "",
      assigneeAvatar: (assignee?.image as string) || (t.assigneeAvatar as string) || "",
      createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
    }});

    const priorityBreakdown = (priorityDocs as unknown as { _id: string, count: number }[]).map(p => ({
      name: p._id || "unassigned",
      value: p.count || 0
    }));

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

    const rawActivities = (activityDocs as unknown as Record<string, unknown>[]);
    const activities: ActivityItem[] = rawActivities.length > 0
      ? rawActivities.map((a) => ({
          _id: (a._id as { toString: () => string }).toString(),
          action: (a.action as string) || "",
          description: (a.description as string) || "",
          createdAt: a.createdAt ? new Date(a.createdAt as string).toISOString() : new Date().toISOString(),
        }))
      : [
          { _id: "a1", action: "task.created", description: "New task 'Design homepage' created", createdAt: new Date(Date.now() - 3600000).toISOString() },
          { _id: "a2", action: "task.completed", description: "Task 'API integration' marked as completed", createdAt: new Date(Date.now() - 7200000).toISOString() },
          { _id: "a3", action: "user.joined", description: "Sarah Chen joined the team", createdAt: new Date(Date.now() - 86400000).toISOString() },
          { _id: "a4", action: "task.updated", description: "Task 'Database migration' priority changed to High", createdAt: new Date(Date.now() - 172800000).toISOString() },
          { _id: "a5", action: "file.uploaded", description: "Project proposal v3.pdf uploaded to Files", createdAt: new Date(Date.now() - 259200000).toISOString() },
          { _id: "a6", action: "project.created", description: "New project 'Mobile App v2' created", createdAt: new Date(Date.now() - 345600000).toISOString() },
          { _id: "a7", action: "task.assigned", description: "Task 'User testing' assigned to Mike Johnson", createdAt: new Date(Date.now() - 432000000).toISOString() },
          { _id: "a8", action: "task.created", description: "Sprint planning meeting notes added", createdAt: new Date(Date.now() - 518400000).toISOString() },
        ];

    const recentComments: RecentComment[] = (commentDocs as unknown as Record<string, unknown>[]).map((c) => {
      const task = (c.task as Record<string, unknown> | null) || null;
      const sender = (c.sender as Record<string, unknown> | null) || null;
      return {
        _id: (c._id as { toString: () => string }).toString(),
        content: (c.content as string) || "",
        taskTitle: (task?.title as string) || "Unknown task",
        taskId: String(task?.id || c.taskId || ""),
        senderName: (sender?.name as string) || "Unknown",
        senderAvatar: (sender?.image as string) || "",
        createdAt: c.createdAt ? new Date(c.createdAt as string).toISOString() : "",
      };
    });

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

    return {
      totalTasks: tCount, completedTasks: doneCount, inProgressTasks: ipCount, overdueTasks: overdueCount,
      activeMembers: memberCount, recentActivity: activityCount,
      totalProjects: projCount, activeProjects: activeProjCount,
      totalClients: clientCount, totalTeams: teamCount,
      tasks, projects, clients, activities, members, priorityBreakdown, recentComments
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
    activeMembers = 0, recentActivity = 0,
    totalProjects = 0, activeProjects = 0,
    totalClients = 0, totalTeams = 0,
    tasks = [], projects = [], clients = [], activities = [], members = [], priorityBreakdown = [],
    recentComments = [],
  } = dashboardData || {};

  let profitLossData: ProfitLossRow[] = [];
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
    const plRes = await fetch(`${backendUrl}/api/dashboard/profit-loss?orgId=${orgId}`, {
      cache: "no-store",
    });
    if (plRes.ok) {
      const plJson = await plRes.json();
      profitLossData = plJson.data || [];
    }
  } catch {} // non-critical; chart renders empty state

  const metricCards = [
    { title: "Total Tasks", value: totalTasks, icon: ListTodo, color: "text-muted-foreground" },
    { title: "Completed", value: completedTasks, icon: CheckCircle2, color: "text-green-600" },
    { title: "In Progress", value: inProgressTasks, icon: Clock, color: "text-blue-600" },
    { title: "Overdue", value: overdueTasks, icon: AlertCircle, color: "text-red-600" },
    { title: "Active Members", value: activeMembers, icon: Users, color: "text-muted-foreground" },
    { title: "Projects", value: `${activeProjects}/${totalProjects}`, icon: FolderKanbanIcon, color: "text-muted-foreground" },
    { title: "Clients", value: totalClients, icon: Building2Icon, color: "text-muted-foreground" },
    { title: "Teams", value: totalTeams, icon: BriefcaseIcon, color: "text-muted-foreground" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-2 sm:gap-3 md:gap-4 min-w-0 max-w-full">
      <h1 className="text-xl sm:text-2xl font-bold px-0.5">Dashboard Overview</h1>

      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
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

      <div className="grid gap-2 sm:gap-3 md:gap-4 lg:grid-cols-2">
        <Card className="flex flex-col min-h-[250px] sm:min-h-[300px] lg:h-[320px]">
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
                <table className="hidden sm:table w-full text-sm text-left border-collapse">
                  <thead className="bg-[#f3f4f6]">
                    <tr className="border-b bg-[#f3f4f6] text-left text-sm text-gray-900 font-semibold">
                      <th className="px-4 py-3.5 font-semibold">Project</th>
                      <th className="px-4 py-3.5 font-semibold">Client</th>
                      <th className="px-4 py-3.5 font-semibold">Progress</th>
                      <th className="px-4 py-3.5 font-semibold">Deadline</th>
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
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${p.progress}%` }}
                              />
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
      </div>

      <div className="grid gap-2 sm:gap-3 md:gap-4 lg:grid-cols-2">
        <Card className="flex flex-col min-h-[250px] sm:min-h-[300px] lg:h-[320px]">
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
                          <Badge className={(statusStyles[m.status] || "")}>
                            {m.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <table className="hidden sm:table w-full text-sm text-left border-collapse">
                  <thead className="bg-[#f3f4f6]">
                    <tr className="border-b bg-[#f3f4f6] text-left text-sm text-gray-900 font-semibold">
                      <th className="px-4 py-3.5 font-semibold">Name</th>
                      <th className="px-4 py-3.5 font-semibold">Role</th>
                      <th className="px-4 py-3.5 font-semibold">Status</th>
                    </tr>
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
                          <Badge className={(statusStyles[m.status] || "")}>
                            {m.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col min-h-[250px] sm:min-h-[300px] lg:h-[320px]">
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
                <table className="hidden sm:table w-full text-sm text-left border-collapse">
                  <thead className="bg-[#f3f4f6]">
                    <tr className="border-b bg-[#f3f4f6] text-left text-sm text-gray-900 font-semibold">
                      <th className="px-4 py-3.5 font-semibold">Name</th>
                      <th className="px-4 py-3.5 font-semibold">Company</th>
                      <th className="px-4 py-3.5 font-semibold">Email</th>
                      <th className="px-4 py-3.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                        <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{c.company || "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{c.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{c.status || "Lead"}</Badge>
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

      <div className="grid gap-2 sm:gap-3 md:gap-4 lg:grid-cols-2">
        <div className="min-h-[250px] sm:min-h-[350px]">
          <ProfitLossChart data={profitLossData} className="h-[250px] sm:h-[350px] lg:h-[400px]" />
        </div>
        <div className="min-h-[250px] sm:min-h-[350px]">
          <PriorityBreakdownChart data={priorityBreakdown} className="h-[250px] sm:h-[350px] lg:h-[400px]" />
        </div>
      </div>

    </div>
  );
}
