import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import {
  UsersIcon,
  ListTodoIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  BriefcaseIcon,
  UserCheckIcon,
  UserXIcon,
  ChartNoAxesCombinedIcon,
  CalendarIcon,
  HourglassIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type StaffMember = {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  image: string;
};

type Task = {
  _id: string;
  title: string;
  priority: string;
  status: string;
  assigneeId: string;
  assigneeName: string;
  createdAt: string;
  dueDate: string | null;
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-200 text-gray-800",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const statusStyles: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100",
  medium: "bg-gray-200",
  high: "bg-orange-100",
  urgent: "bg-red-100",
};

export default async function StaffsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let staff: StaffMember[] = [];
  let tasks: Task[] = [];

  if (orgId) {
    const orgMembers = (await db
      .collection(collections.orgMembers)
      .find({ orgId })
      .toArray()) as unknown as { userId: string; role: string }[];
    const userIds = orgMembers.map((m) => m.userId);

    const users = (await db
      .collection(collections.users)
      .find({ id: { $in: userIds } }, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray()) as unknown as Record<string, unknown>[];

    staff = users.map((u) => {
      const member = orgMembers.find((m) => m.userId === (u.id as string));
      return {
        _id: (u._id as { toString: () => string }).toString(),
        name: (u.name as string) || "",
        email: (u.email as string) || "",
        role: ((member?.role as string) || "member"),
        department: (u.department as string) || "",
        status: (u.status as string) || "offline",
        image: (u.image as string) || "",
      };
    });

    // Fetch last 10 tasks for this org (mirrors /api/tasks?orgId=...&limit=10)
    const rawTasks = (await db
      .collection(collections.tasks)
      .find({ orgId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()) as unknown as Record<string, unknown>[];

    tasks = rawTasks.map((t) => ({
      _id: (t._id as { toString: () => string }).toString(),
      title: (t.title as string) || "",
      priority: (t.priority as string) || "medium",
      status: (t.status as string) || "todo",
      assigneeId: (t.assigneeId as string) || "",
      assigneeName: (t.assigneeName as string) || "",
      createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
      dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
    }));
  }

  const totalStaff = staff.length;
  const activeStaff = staff.filter((s) => s.status === "active").length;
  const onLeave = staff.filter((s) => s.status === "on_leave").length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;

  const today = new Date().toDateString();
  const todayTasks = tasks.filter((t) => {
    const d = t.createdAt ? new Date(t.createdAt).toDateString() : "";
    return d === today;
  }).length;
  const pendingTasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length;

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const statusDist = ["todo", "in_progress", "review", "done", "cancelled"].map((s) => ({
    status: s,
    count: tasks.filter((t) => t.status === s).length,
  }));

  const priorityDist = ["urgent", "high", "medium", "low"].map((p) => ({
    priority: p,
    count: tasks.filter((t) => t.priority === p).length,
    color: priorityColors[p],
  }));

  const absentCount = onLeave + (totalStaff - activeStaff - onLeave);
  const staffByStatus = [
    { label: "Present", count: activeStaff, icon: UserCheckIcon, color: "bg-green-500" },
    { label: "Absent", count: absentCount, icon: UserXIcon, color: "bg-gray-500" },
  ];

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BriefcaseIcon className="size-6" />
          <h1 className="text-2xl font-bold">Staff Dashboard</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon className="size-3.5" /> Today Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Tasks created today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <HourglassIcon className="size-3.5" /> Pending Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Tasks not yet completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2Icon className="size-3.5" /> Completed Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Tasks done</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ListTodoIcon className="size-3.5" /> Total Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">All tasks</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <UsersIcon className="size-4" />
              Staff Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staffByStatus.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className={`size-3 rounded-full ${s.color}`} />
                  <span className="text-sm w-20">{s.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${s.color} rounded-full`}
                      style={{ width: `${totalStaff > 0 ? (s.count / totalStaff) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ChartNoAxesCombinedIcon className="size-4" />
              Task Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusDist.map((s) => (
                <div key={s.status} className="flex items-center gap-3">
                  <span className={`size-3 rounded-full ${(statusStyles[s.status] || "").split(" ")[0]}`} />
                  <span className="text-sm capitalize w-24">{s.status.replace(/_/g, " ")}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${(statusStyles[s.status] || "").split(" ")[0]} rounded-full`}
                      style={{ width: `${totalTasks > 0 ? (s.count / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ChartNoAxesCombinedIcon className="size-4" />
              Priority Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {priorityDist.map((p) => (
                <div key={p.priority} className="flex items-center gap-3">
                  <div className={`size-3 rounded-full ${p.color}`} />
                  <span className="text-sm capitalize w-16">{p.priority}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${p.color} rounded-full`}
                      style={{ width: `${totalTasks > 0 ? (p.count / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{p.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2Icon className="size-4" />
            Performance Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
              <p className="text-xs text-muted-foreground mt-1">Tasks Completed</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{tasks.filter((t) => t.status === "in_progress").length}</p>
              <p className="text-xs text-muted-foreground mt-1">In Progress</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{tasks.filter((t) => t.priority === "urgent" || t.priority === "high").length}</p>
              <p className="text-xs text-muted-foreground mt-1">High Priority</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{activeStaff}</p>
              <p className="text-xs text-muted-foreground mt-1">Active Staff</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ListTodoIcon className="size-4" />
            Recently Allocated Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks allocated yet</p>
          ) : (
            <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead className="bg-[#f3f4f6]">
                  <tr className="border-b bg-[#f3f4f6] text-left text-sm text-gray-900 font-semibold">
                    <th className="px-4 py-3.5 font-semibold text-left">Task</th>
                    <th className="px-4 py-3.5 font-semibold text-left">Assignee</th>
                    <th className="px-4 py-3.5 font-semibold text-left">Priority</th>
                    <th className="px-4 py-3.5 font-semibold text-left">Status</th>
                    <th className="px-4 py-3.5 font-semibold text-left">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTasks.map((t) => (
                    <tr key={t._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                      <td className="px-4 py-3 text-sm font-medium">{t.title}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{t.assigneeName || "Unassigned"}</td>
                      <td className="px-4 py-3">
                        <Badge className={(priorityStyles[t.priority] || "") + ""}>
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={(statusStyles[t.status] || "") + ""}>
                          {t.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
