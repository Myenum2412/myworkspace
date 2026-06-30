"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon, ListTodoIcon, ClockIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon, EyeIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { TaskAllocationModal } from "@/components/task-allocation/task-allocation-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { TaskEditForm } from "@/components/task-edit-form";
import type { ComponentProps } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ViewToggle } from "@/components/view-toggle";
import { Task, useRealtimeTasks } from "@/hooks/use-realtime-tasks";
import { getSocketIO } from "@/lib/socketio-client";

type UiTask = ComponentProps<typeof TaskEditForm>["task"];

const statusStyles: Record<string, string> = {
  todo: "bg-gray-200 text-gray-700",
  in_progress: "bg-red-900 text-red-700",
  review: "bg-gray-700 text-gray-700",
  done: "bg-red-800 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-700 text-gray-700",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const statusGroups = ["todo", "in_progress", "review", "done", "cancelled"];

export type MyTasksProps = {
  /** SSR-fetched org tasks (assignee/creator already resolved server-side). */
  initialTasks: Task[];
  /** The resolved org id for the active user. */
  orgId: string;
  /** The resolved user id for the active user. */
  userId: string;
};

export default function MyTasksInteractive({ initialTasks, orgId, userId }: MyTasksProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "table">("table");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<UiTask | null>(null);

  // Seed React Query with the SSR payload so the realtime hook's fetcher
  // short-circuits on warm cache.
  const queryKey = useMemo(() => ["tasks", orgId] as const, [orgId]);
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !orgId) return;
    seeded.current = true;
    queryClient.setQueryData(queryKey, initialTasks);
  }, [queryClient, queryKey, orgId, initialTasks]);

  // Connect the shared socket once.
  useEffect(() => {
    getSocketIO();
  }, []);

  const { data: tasks, set: setTasks } = useRealtimeTasks(orgId);

  // Filter to the current user's assigned tasks.
  const myTasks = useMemo(
    () => (userId ? tasks.filter((t) => t.assigneeId === userId) : tasks),
    [tasks, userId],
  );

  const summary = useMemo(() => {
    const init = { todo: 0, in_progress: 0, review: 0, done: 0, cancelled: 0 };
    return myTasks.reduce((acc, t) => {
      if (t.status in init) acc[t.status as keyof typeof init]++;
      return acc;
    }, init);
  }, [myTasks]);

  const handleSave = useCallback(async (updated: UiTask, selected: UiTask | null) => {
    try {
      const payload: Record<string, unknown> = { _id: updated._id };
      if (updated.title !== selected?.title) payload.title = updated.title;
      if (updated.description !== selected?.description) payload.description = updated.description;
      if (updated.status !== selected?.status) payload.status = updated.status;
      if (updated.priority !== selected?.priority) payload.priority = updated.priority;
      if (updated.assigneeId !== selected?.assigneeId) payload.assigneeId = updated.assigneeId;
      if (updated.dueDate !== selected?.dueDate) payload.dueDate = updated.dueDate;
      const res = await fetch(`/api/tasks/${updated._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Save failed");
      }
    } catch (error) {
      console.error("[MYTASKS] Failed to save task:", error);
      return;
    }
    setTasks((prev) => prev.map((t) => t._id === updated._id ? (updated as unknown as Task) : t));
    setEditOpen(false);
    setSelectedTask(null);
  }, [setTasks]);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">My Tasks</h1>
            <div className="flex gap-1 ml-2">
              <ViewToggle
                options={[{ value: "table", label: "Table" }, { value: "kanban", label: "Kanban" }]}
                value={view}
                onChange={(v) => setView(v as typeof view)}
              />
            </div>
          </div>
          <Button onClick={() => setShowTaskModal(true)}>
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-6 mb-6">
          <Card className="bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <ListTodoIcon className="size-4" /> Today Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.todo}</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <ClockIcon className="size-4" /> In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.in_progress}</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircleIcon className="size-4" /> Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.review}</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2Icon className="size-4" /> Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.done}</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <XCircleIcon className="size-4" /> Cancelled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.cancelled}</div>
            </CardContent>
          </Card>
        </div>

        {view === "table" ? (
        <Card>
          <CardHeader><CardTitle>Assigned to me</CardTitle></CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks assigned to you.</p>
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
                    {myTasks.map((t, idx) => (
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
                        <TableCell><Badge className={statusStyles[t.status] || ""}>{t.status.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell><Badge className={priorityStyles[t.priority] || ""}>{t.priority}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); }}><EyeIcon className="mr-2 size-4" />View</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedTask(t as unknown as UiTask); setEditOpen(true); }}><PencilIcon className="mr-2 size-4" />Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive"><Trash2Icon className="mr-2 size-4" />Delete</DropdownMenuItem>
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
        ) : (
          <div className="grid gap-4 md:grid-cols-5">
            {statusGroups.map((s) => {
              const items = myTasks.filter((t) => t.status === s);
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
                            <Badge className={(priorityStyles[t.priority] || "") + " shrink-0"}>{t.priority}</Badge>
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
        )}

        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="p-0 flex flex-col">
            {selectedTask && (
              <TaskDetailedView
                task={selectedTask}
                onEdit={(t) => { setViewOpen(false); setSelectedTask(t as unknown as UiTask); setEditOpen(true); }}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="p-0 flex flex-col">
            {selectedTask && (
              <TaskEditForm
                task={selectedTask}
                onSave={(updated) => handleSave(updated, selectedTask)}
                onCancel={() => setEditOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        <TaskAllocationModal
          open={showTaskModal}
          onClose={() => setShowTaskModal(false)}
        />
      </main>
    </>
  );
}
