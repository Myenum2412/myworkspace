"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListTodoIcon, ClockIcon, CheckCircle2Icon, AlertCircleIcon, MoreHorizontalIcon, PencilIcon, EyeIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { TaskEditForm } from "@/components/task-edit-form";
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
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-200 text-gray-800",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export default function TasksInteractive({ tasks }: { tasks: Task[] }) {
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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

        <div className="grid gap-4 md:grid-cols-4">
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-blue-50">
                    <TableRow>
                      <TableHead className="bg-blue-50 w-10"><Checkbox /></TableHead>
                      <TableHead className="bg-blue-50 w-20">Task #</TableHead>
                      <TableHead className="bg-blue-50">Task</TableHead>
                      <TableHead className="bg-blue-50">Assigned To</TableHead>
                      <TableHead className="bg-blue-50">Delegated By</TableHead>
                      <TableHead className="bg-blue-50">Status</TableHead>
                      <TableHead className="bg-blue-50">Priority</TableHead>
                      <TableHead className="bg-blue-50">Due Date</TableHead>
                      <TableHead className="bg-blue-50 w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localTasks.map((t, idx) => (
                      <TableRow key={t._id} className="bg-white">
                        <TableCell><Checkbox /></TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">#{idx + 1}</TableCell>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell><span className="text-sm">{t.creatorName || "—"}</span></TableCell>
                        <TableCell>
                          <Badge className={(statusStyles[t.status] || "") + ""}>
                            {t.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={(priorityStyles[t.priority] || "") + ""}>
                            {t.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedTask(t); setViewOpen(true); }}>
                                <EyeIcon className="mr-2 size-4" />View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedTask(t); setEditOpen(true); }}>
                                <PencilIcon className="mr-2 size-4" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="p-0 flex flex-col">
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask}
              onEdit={(t) => { setViewOpen(false); setSelectedTask(t as Task); setEditOpen(true); }}
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
                setLocalTasks((prev) => prev.map((t) => t._id === updated._id ? (updated as Task) : t));
                setEditOpen(false);
                setSelectedTask(null);
              }}
              onCancel={() => setEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
