"use client";

import { useState } from "react";
import { PlusIcon, ListTodoIcon, UsersIcon, ClockIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon, BookmarkIcon, CalendarClockIcon, ChartNoAxesCombinedIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskAllocationModal } from "@/components/task-allocation/task-allocation-modal";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { TaskEditForm } from "@/components/task-edit-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EyeIcon, PencilIcon, Trash2Icon, MoreHorizontalIcon } from "lucide-react";
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

export type Task = {
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
  isBookmarked?: boolean;
};

export interface OverviewInteractiveProps {
  tasks: Task[];
  currentUserId: string;
}

const statusStyles: Record<string, string> = {
  todo: "bg-gray-200 text-gray-700",
  in_progress: "bg-red-900 text-red-700",
  review: "bg-gray-700 text-gray-700",
  done: "bg-red-900 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-700 text-gray-700",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const statusInfo = [
  { key: "todo", label: "To Do", icon: ListTodoIcon, color: "bg-gray-1000" },
  { key: "in_progress", label: "In Progress", icon: ClockIcon, color: "bg-red-500" },
  { key: "review", label: "Review", icon: AlertCircleIcon, color: "bg-red-500" },
  { key: "done", label: "Completed", icon: CheckCircle2Icon, color: "bg-red-500" },
  { key: "cancelled", label: "Cancelled", icon: XCircleIcon, color: "bg-red-500" },
];

const priorityColors: Record<string, string> = {
  low: "bg-gray-100",
  medium: "bg-gray-200 text-gray-800",
  high: "bg-orange-100",
  urgent: "bg-red-100",
};

export default function OverviewInteractive({ tasks: initialTasks, currentUserId }: OverviewInteractiveProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const total = tasks.length;
  const myTasks = currentUserId ? tasks.filter((t) => t.assigneeId === currentUserId).length : 0;
  const savedCount = tasks.filter((t) => t.isBookmarked).length;
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
    .slice(0, 10);

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
    <>
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

        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-border rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{total}</div>
              <p className="text-xs text-muted-foreground mt-1">{completedCount} completed ({completionRate}%)</p>
            </CardContent>
          </Card>
          <Card className="border-border rounded-xl">
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
          <Card className="border-border rounded-xl">
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
          <Card className="border-border rounded-xl">
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
          <Card className="border-border rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2Icon className="size-3.5" /> Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completionRate}%</div>
              <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border rounded-xl">
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

          <Card className="border-border rounded-xl">
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


        </div>

        <Card className="border-border rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm">Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f3f4f6] text-gray-900 border-b">
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-10"><Checkbox /></th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-20">Task #</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Task</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Assigned To</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Delegated By</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Status</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Priority</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Due Date</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTasks.length === 0 ? (
                    <tr className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white group">
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No tasks yet</td>
                    </tr>
                  ) : (
                    recentTasks.map((t, idx) => (
                      <tr key={t._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white group">
                        <td className="px-4 py-3"><Checkbox /></td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{t.title}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                              {t.assigneeAvatar ? (
                                <img src={t.assigneeAvatar} alt={t.assigneeName} className="size-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-medium text-muted-foreground">
                                  {(t.assigneeName || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-sm">{t.assigneeName || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="text-sm">{t.creatorName || "—"}</span></td>
                        <td className="px-4 py-3"><Badge className={statusStyles[t.status] || ""}>{t.status.replace(/_/g, " ")}</Badge></td>
                        <td className="px-4 py-3"><Badge className={priorityStyles[t.priority] || ""}>{t.priority}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedTask(t); setViewOpen(true); }}><EyeIcon className="mr-2 size-4" />View</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedTask(t); setEditOpen(true); }}><PencilIcon className="mr-2 size-4" />Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive"><Trash2Icon className="mr-2 size-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask}
              onEdit={(t) => { setViewOpen(false); setSelectedTask(t); setEditOpen(true); }}
              onClose={() => setViewOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
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
    </>
  );
}
