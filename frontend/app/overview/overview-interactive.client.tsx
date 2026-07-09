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
import { TaskAllocationModal } from "@/components/task-allocation/task-allocation-modal";
import { TaskDetailedView } from "@/components/task-detailed-view";
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
import { DataTable } from "@/components/data-table";
import { columns as baseColumns, type Task, statusStyles, priorityStyles } from "./columns";

export interface OverviewInteractiveProps {
  tasks: Task[];
  currentUserId: string;
}

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
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export default function OverviewInteractive({ tasks: initialTasks, currentUserId }: OverviewInteractiveProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  const total = tasks.length;
  const myTasks = currentUserId ? tasks.filter((t) => t.assigneeId === currentUserId).length : 0;
  const savedCount = tasks.filter((t) => t.isBookmarked).length;
  const upcomingCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done" || t.status === "cancelled") return false;
    return new Date(t.dueDate) >= new Date();
  }).length;
  const completedCount = tasks.filter((t) => t.status === "done").length;
  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  async function handleDeleteTask(taskId: string) {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Delete failed" }));
        alert(err.error || "Failed to delete task");
        return;
      }
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      if (selectedTask?._id === taskId) { setSelectedTask(null); setViewOpen(false); }
    } catch (e) {
      alert("Network error while deleting task");
    } finally {
      setDeleting(false);
    }
  }

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListTodoIcon className="size-5 sm:size-6" />
            <h1 className="text-xl sm:text-2xl font-bold">Task Overview</h1>
          </div>
          <Button onClick={() => setShowTaskModal(true)} className="w-full sm:w-auto touch-target">
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
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
              <div className="space-y-4 sm:space-y-6">
                {priorityDist.map((p) => (
                  <div key={p.priority} className="flex items-center justify-center gap-2 sm:gap-4">
                    <div className={`size-3 sm:size-4 rounded-full shrink-0 ${p.color}`} />
                    <span className="text-[11px] sm:text-sm capitalize w-12 sm:w-16">{p.priority}</span>
                    <div className="w-full max-w-lg h-6 sm:h-8 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${p.color} rounded-full`}
                        style={{ width: `${total > 0 ? (p.count / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-[11px] sm:text-sm font-semibold w-6 sm:w-8 text-right">{p.count}</span>
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
            <DataTable
              columns={baseColumns.map((col) => ({
                ...col,
                cell: col.id === "actions"
                  ? ({ row }: { row: { original: Task } }) => {
                      const t = row.original;
                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedTask(t); setViewOpen(true); }}><EyeIcon className="mr-2 size-4" />View</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedTask(t); setViewOpen(true); setEditMode(true); }}><PencilIcon className="mr-2 size-4" />Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" disabled={deleting} onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteTask(t._id); }}><Trash2Icon className="mr-2 size-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    }
                  : col.cell,
              }))}
              data={recentTasks}
              onRowClick={(t) => { setSelectedTask(t); setViewOpen(true); }}
              searchPlaceholder="Search tasks..."
              label="task(s)"
              emptyMessage="No tasks yet."
              emptyIcon={<ListTodoIcon className="size-6 text-muted-foreground/50" />}
              mobileCardView={true}
              renderMobileCard={(task: Task) => (
                <div
                  className="border rounded-lg bg-card p-3 space-y-2 shadow-sm active:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => { setSelectedTask(task); setViewOpen(true); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm flex-1 line-clamp-2">{task.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className={`text-[10px] px-1.5 py-0.5 ${statusStyles[task.status] || ""}`}>
                        {task.status.replace(/_/g, " ")}
                      </Badge>
                      <Badge className={`text-[10px] px-1.5 py-0.5 ${priorityStyles[task.priority] || ""}`}>
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="size-5 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {task.assigneeAvatar ? (
                          <img src={task.assigneeAvatar} alt={task.assigneeName} className="size-full object-cover" />
                        ) : (
                          <span className="text-[8px] font-medium">
                            {(task.assigneeName || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="truncate">{task.assigneeName || "\u2014"}</span>
                    </div>
                    {task.dueDate && (
                      <span className="shrink-0 ml-2">{new Date(task.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              )}
            />
          </CardContent>
        </Card>
      </main>

      <Dialog open={viewOpen} onOpenChange={(open) => { if (!open) { setViewOpen(false); setEditMode(false); setSelectedTask(null); } }}>
        <DialogContent className="p-0 flex flex-col sm:max-w-4xl" showCloseButton={false}>
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask}
              editable
              onTaskUpdate={(updated) => {
                setTasks((prev) => prev.map((t) => t._id === updated._id ? updated : t));
              }}
              onClose={() => { setViewOpen(false); setEditMode(false); setSelectedTask(null); }}
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
