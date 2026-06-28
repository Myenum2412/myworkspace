"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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

export default function StaffsPage() {
  const { data: session } = useSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    let profileOrgId = "";

    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        profileOrgId = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (!profileOrgId) return Promise.reject();
        return Promise.all([
          fetch("/api/employees", { credentials: "include" }).then((r) => r.json()),
          fetch(`/api/tasks?orgId=${profileOrgId}&limit=10`, { credentials: "include" }).then((r) => r.json()),
        ]);
      })
      .then((results) => {
        if (!results) return;
        const [empData, taskData] = results;
        if (empData) {
          const arr = Array.isArray(empData) ? empData : empData.data || [];
          setStaff(arr);
        }
        if (taskData) {
          const arr = Array.isArray(taskData) ? taskData : taskData.data || [];
          setTasks(arr);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <AlertCircleIcon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
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

          {/* Staff Status & Priority Breakdown */}
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

          {/* Performance Report */}
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

          {/* Recently Allocated Tasks */}
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-blue-50">
                      <tr className="border-b bg-blue-50 text-left text-sm text-blue-800 font-medium">
                        <th className="pb-3 font-medium">Task</th>
                        <th className="pb-3 font-medium">Assignee</th>
                        <th className="pb-3 font-medium">Priority</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTasks.map((t) => (
                        <tr key={t._id} className="border-b last:border-0 hover:bg-blue-50/50 transition-colors bg-white">
                          <td className="py-3 pr-4 text-sm font-medium">{t.title}</td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground">{t.assigneeName || "Unassigned"}</td>
                          <td className="py-3 pr-4">
                            <Badge className={(priorityStyles[t.priority] || "") + ""}>
                              {t.priority}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge className={(statusStyles[t.status] || "") + ""}>
                              {t.status.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
