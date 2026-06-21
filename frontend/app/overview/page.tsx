"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { PlusIcon, ListTodoIcon, UsersIcon, ClockIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon, BookmarkIcon, CalendarClockIcon, ChartNoAxesCombinedIcon } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskAllocationModal } from "@/components/task-allocation/task-allocation-modal";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { TaskEditForm } from "@/components/task-edit-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  EvilRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
  Dot,
  ActiveDot,
} from "@/components/evilcharts/charts/radar-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/chart";

type Task = {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
};

const statusGroups = ["todo", "in_progress", "review", "done", "cancelled"];

const statusStyles: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-amber-100 text-amber-700",
  review: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const FAKE_TASKS: Task[] = [
  { _id: "1", title: "Design new dashboard layout", description: "Create wireframes for the main dashboard", status: "in_progress", priority: "high", dueDate: "2026-07-01T00:00:00Z", assigneeId: "u1", assigneeName: "Alice Chen", assigneeAvatar: "", creatorId: "u2", creatorName: "Bob Martinez", createdAt: "2026-06-10T00:00:00Z" },
  { _id: "2", title: "Implement user authentication", description: "Set up OAuth and session management", status: "todo", priority: "urgent", dueDate: "2026-06-28T00:00:00Z", assigneeId: "u3", assigneeName: "Carol Williams", assigneeAvatar: "", creatorId: "u1", creatorName: "Alice Chen", createdAt: "2026-06-08T00:00:00Z" },
  { _id: "3", title: "API integration for payment gateway", description: "Connect Stripe for subscription billing", status: "review", priority: "high", dueDate: "2026-06-30T00:00:00Z", assigneeId: "u2", assigneeName: "Bob Martinez", assigneeAvatar: "", creatorId: "u1", creatorName: "Alice Chen", createdAt: "2026-06-05T00:00:00Z" },
  { _id: "4", title: "Write unit tests for user module", description: "Cover all user service functions", status: "done", priority: "medium", dueDate: "2026-06-25T00:00:00Z", assigneeId: "u1", assigneeName: "Alice Chen", assigneeAvatar: "", creatorId: "u3", creatorName: "Carol Williams", createdAt: "2026-06-01T00:00:00Z" },
  { _id: "5", title: "Mobile responsive fixes", description: "Fix layout issues on mobile devices", status: "todo", priority: "medium", dueDate: "2026-07-05T00:00:00Z", assigneeId: "u4", assigneeName: "David Kim", assigneeAvatar: "", creatorId: "u1", creatorName: "Alice Chen", createdAt: "2026-06-12T00:00:00Z" },
  { _id: "6", title: "Database optimization", description: "Add indexes and optimize slow queries", status: "in_progress", priority: "high", dueDate: "2026-07-02T00:00:00Z", assigneeId: "u3", assigneeName: "Carol Williams", assigneeAvatar: "", creatorId: "u2", creatorName: "Bob Martinez", createdAt: "2026-06-09T00:00:00Z" },
  { _id: "7", title: "User onboarding flow", description: "Design and implement new user onboarding", status: "review", priority: "medium", dueDate: "2026-06-29T00:00:00Z", assigneeId: "u1", assigneeName: "Alice Chen", assigneeAvatar: "", creatorId: "u3", creatorName: "Carol Williams", createdAt: "2026-06-07T00:00:00Z" },
  { _id: "8", title: "Security audit", description: "Review code for vulnerabilities", status: "cancelled", priority: "low", dueDate: "2026-06-20T00:00:00Z", assigneeId: "u2", assigneeName: "Bob Martinez", assigneeAvatar: "", creatorId: "u4", creatorName: "David Kim", createdAt: "2026-06-03T00:00:00Z" },
];

const statusInfo = [
  { key: "todo", label: "To Do", icon: ListTodoIcon, color: "bg-gray-500" },
  { key: "in_progress", label: "In Progress", icon: ClockIcon, color: "bg-amber-500" },
  { key: "review", label: "Review", icon: AlertCircleIcon, color: "bg-blue-500" },
  { key: "done", label: "Completed", icon: CheckCircle2Icon, color: "bg-emerald-500" },
  { key: "cancelled", label: "Cancelled", icon: XCircleIcon, color: "bg-red-500" },
];

const priorityColors: Record<string, string> = {
  low: "bg-gray-200",
  medium: "bg-blue-200",
  high: "bg-orange-200",
  urgent: "bg-red-200",
};

export default function OverviewPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>(FAKE_TASKS);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const uid = profile?._id?.toString() || session.user?.id || "";
        setCurrentUserId(uid);
        const orgId = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (orgId) {
          return fetch(`/api/tasks?orgId=${orgId}`, { credentials: "include" });
        }
        return null;
      })
      .then((res) => res?.json())
      .then((d) => {
        if (d) {
          const arr = Array.isArray(d) ? d : d.data || [];
          if (arr.length > 0) setTasks(arr);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
  };

  const total = tasks.length;
  const myTasks = currentUserId ? tasks.filter((t) => t.assigneeId === currentUserId).length : 0;
  const savedIds = ["1", "3", "5", "7"];
  const savedCount = tasks.filter((t) => savedIds.includes(t._id)).length;
  const upcomingCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done" || t.status === "cancelled") return false;
    return new Date(t.dueDate) >= new Date();
  }).length;
  const completedCount = tasks.filter((t) => t.status === "done").length;
  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const upcomingSoon = tasks
    .filter((t) => t.dueDate && t.status !== "done" && t.status !== "cancelled")
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const priorityDist = ["urgent", "high", "medium", "low"].map((p) => ({
    priority: p,
    count: tasks.filter((t) => t.priority === p).length,
    color: priorityColors[p],
  }));

  const radarChartData = statusInfo.map((s) => ({
    status: s.label,
    count: tasks.filter((t) => t.status === s.key).length,
  }));

  const radarChartConfig = {
    count: { label: "Tasks", colors: { light: ["hsl(var(--primary))"], dark: ["hsl(var(--primary))"] } },
  } satisfies ChartConfig;

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodoIcon className="size-6" />
              <h1 className="text-2xl font-bold">Task Overview</h1>
            </div>
            <Button onClick={() => setShowTaskModal(true)}>
              <PlusIcon className="mr-2 size-4" />
              New Task
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><AlertCircleIcon className="size-6 animate-spin text-muted-foreground" /></div>
          ) : (
          <>
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{total}</div>
                  <p className="text-xs text-muted-foreground mt-1">{completedCount} completed ({completionRate}%)</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <UsersIcon className="size-3.5" /> My Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{myTasks}</div>
                  <p className="text-xs text-muted-foreground mt-1">Assigned to you</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <BookmarkIcon className="size-3.5" /> Saved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{savedCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Bookmarked tasks</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CalendarClockIcon className="size-3.5" /> Upcoming
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{upcomingCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Pending due dates</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2Icon className="size-3.5" /> Completion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{completionRate}%</div>
                  <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ChartNoAxesCombinedIcon className="size-4" />
                    Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EvilRadarChart
                    config={radarChartConfig}
                    data={radarChartData}
                    className="aspect-square max-h-[260px]"
                  >
                    <PolarGrid />
                    <PolarAngleAxis dataKey="status" />
                    <PolarRadiusAxis domain={[0, "auto"]} />
                    <Radar dataKey="count" variant="filled" isGlowing isClickable>
                      <Dot />
                      <ActiveDot />
                    </Radar>
                    <Tooltip defaultIndex={0} />
                    <Legend variant="circle" align="center" isClickable />
                  </EvilRadarChart>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Priority Breakdown</CardTitle>
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
                            style={{ width: `${total > 0 ? (p.count / total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recent Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks yet</p>
                  ) : (
                    <div className="space-y-2">
                      {recentTasks.map((t) => (
                        <div key={t._id} className="flex items-center justify-between rounded-lg border p-2.5 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setSelectedTask(t); setViewOpen(true); }}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{t.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {t.assigneeName ? `Assigned to ${t.assigneeName}` : "Unassigned"}
                            </p>
                          </div>
                          <Badge className={priorityStyles[t.priority] || "" + " shrink-0 ml-2 text-[10px] px-1.5 py-0"}>
                            {t.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              {statusGroups.map((s) => {
                const items = tasks.filter((t) => t.status === s);
                return (
                  <div key={s} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold capitalize">{s.replace(/_/g, " ")}</h3>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
                    </div>
                    <div className="flex flex-col gap-2 min-h-[120px]">
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-1">No tasks</p>
                      ) : (
                        items.map((t) => (
                          <div key={t._id} className="rounded-lg border bg-card p-3 space-y-2 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium leading-tight">{t.title}</p>
                              <Badge className={priorityStyles[t.priority] || "" + " shrink-0"}>{t.priority}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="size-5 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                  {t.assigneeAvatar ? (
                                    <img src={t.assigneeAvatar} alt={t.assigneeName} className="size-full object-cover" />
                                  ) : (
                                    <span className="text-[8px] font-medium text-muted-foreground">
                                      {(t.assigneeName || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground">{t.assigneeName}</span>
                              </div>
                              {t.dueDate && (
                                <span className="text-[10px] text-muted-foreground">{new Date(t.dueDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
          )}
        </main>
      </SidebarInset>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="p-0 flex flex-col">
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask}
              onEdit={(t) => { setViewOpen(false); setSelectedTask(t); setEditOpen(true); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="p-0 flex flex-col">
          {selectedTask && (
            <TaskEditForm
              task={selectedTask}
              onSave={(updated) => {
                setTasks((prev) => prev.map((t) => t._id === updated._id ? updated : t));
                setEditOpen(false);
                setSelectedTask(null);
              }}
              onCancel={() => setEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <TaskAllocationModal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
      />
    </SidebarProvider>
  );
}
