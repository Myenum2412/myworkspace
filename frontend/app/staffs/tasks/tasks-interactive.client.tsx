"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListTodoIcon, ClockIcon, CheckCircle2Icon, AlertCircleIcon, MoreHorizontalIcon, PencilIcon, EyeIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { Checkbox } from "@/components/ui/checkbox";

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

const statusStyles: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  postponed: "bg-orange-100 text-orange-700",
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-200 text-gray-800",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export default function TasksInteractive({ tasks, sessionUserId }: { tasks: Task[]; sessionUserId?: string }) {
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  const total = localTasks.length;
  const completed = localTasks.filter((t) => t.status === "done").length;
  const inProgress = localTasks.filter((t) => t.status === "in_progress").length;
  const pending = localTasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length;

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <ListTodoIcon className="size-6" />
          <h1 className="text-2xl font-bold">My Tasks</h1>
          <Badge variant="secondary" className="ml-auto">{total} tasks</Badge>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <ListTodoIcon className="size-3.5" /> Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <ClockIcon className="size-3.5" /> In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <AlertCircleIcon className="size-3.5" /> Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2Icon className="size-3.5" /> Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completed}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
          <CardContent>
            {localTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <ListTodoIcon className="size-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No tasks found.</p>
              </div>
            ) : (
              <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
                <table className="table-premium w-full text-sm text-left">
                  <thead className="sticky top-0 z-10">
                    <tr>
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
                    {localTasks.map((t, idx) => (
                      <tr key={t._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white group cursor-pointer" onClick={() => { setSelectedTask(t); setViewOpen(true); }}>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><Checkbox /></td>
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
                        <td className="px-4 py-3">
                          <Badge className={(statusStyles[t.status] || "") + ""}>
                            {t.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={(priorityStyles[t.priority] || "") + ""}>
                            {t.priority}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedTask(t); setViewOpen(true); }}>
                                <EyeIcon className="mr-2 size-4" />View
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={viewOpen} onOpenChange={(open) => { if (!open) { setViewOpen(false); setSelectedTask(null); } }}>
        <DialogContent className="p-0 flex flex-col max-w-5xl w-[95vw]">
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask}
              sessionUserId={sessionUserId}
              editable
              onTaskUpdate={(updatedTask) => {
                setLocalTasks((prev) => prev.map((t) => t._id === updatedTask._id ? (updatedTask as Task) : t));
                setSelectedTask(updatedTask as Task);
              }}
              onClose={() => { setViewOpen(false); setSelectedTask(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
