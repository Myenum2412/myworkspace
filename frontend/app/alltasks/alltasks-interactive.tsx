"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon, ListTodoIcon, UsersIcon, ClockIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskAllocationModal } from "@/components/task-allocation/task-allocation-modal";
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
import { TaskDataTable } from "@/components/task-data-table";
import { Task, useRealtimeTasks } from "@/hooks/use-realtime-tasks";
import { getSocketIO } from "@/lib/socketio-client";
import { toast } from "sonner";
import { perfLog, perfNow } from "@/lib/perf";



const statusGroups = ["todo", "assigned", "in_progress", "review", "done", "cancelled"];

// Local UI shape expected by the shared edit/detail components (they ship their
// own non-exported Task type). We keep the hook's Task as the source of truth
// for the list and coerce at the small boundary where these are rendered.
type UiTask = ComponentProps<typeof TaskEditForm>["task"];

export type AllTasksProps = {
  /** SSR-fetched org tasks (assignee/creator already resolved server-side). */
  initialTasks: Task[];
  /** The resolved org id for the active user. */
  orgId: string;
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-200 text-gray-800",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function AllTasksInteractive({ initialTasks, orgId }: AllTasksProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "table">("table");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<UiTask | null>(null);

  // Seed React Query with the SSR payload. The realtime hook specs the key
  // ["tasks", orgId]; pre-populating it means the hook's fetcher (which would
  // hit /api/tasks) short-circuits on warm cache. useMemo keeps the key stable
  // across re-renders so the seed effect runs exactly once.
  const queryKey = useMemo(() => ["tasks", orgId] as const, [orgId]);
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !orgId) return;
    seeded.current = true;
    queryClient.setQueryData(queryKey, initialTasks);
  }, [queryClient, queryKey, orgId, initialTasks]);

  // Connect the shared socket once. The realtime hook's per-event subscriptions
  // deltas keep the list live across clients for the lifetime of the page.
  useEffect(() => {
    getSocketIO();
  }, []);

  const { data: tasks, set: setTasks } = useRealtimeTasks(orgId);

  // Status-summary cards — single memoized pass over the list.
  const summary = useMemo(() => {
    const t0 = perfNow();
    const init = { todo: 0, assigned: 0, in_progress: 0, review: 0, done: 0, cancelled: 0 };
    const counts = tasks.reduce((acc, t) => {
      if (t.status === "todo") acc.todo++;
      else if (t.status === "assigned") acc.assigned++;
      else if (t.status === "in_progress") acc.in_progress++;
      else if (t.status === "review") acc.review++;
      else if (t.status === "done") acc.done++;
      else if (t.status === "cancelled") acc.cancelled++;
      return acc;
    }, init);
    perfLog("tasks.summary", perfNow() - t0, { n: tasks.length });
    return counts;
  }, [tasks]);

  const handleDelete = useCallback(async (t: Task) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    const t0 = perfNow();
    try {
      const res = await fetch(`/api/tasks/${t._id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setTasks((prev) => prev.filter((x) => x._id !== t._id));
        perfLog("tasks.delete", perfNow() - t0);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete task";
      toast.error(message);
    }
  }, [setTasks]);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">All Tasks</h1>
              <div className="flex gap-1">
                <ViewToggle
                  options={[{ value: "table", label: "Table" }, { value: "kanban", label: "Kanban" }]}
                  value={view}
                  onChange={(v) => setView(v as typeof view)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Manage all tasks across your organization</p>
          </div>
          <Button onClick={() => setShowTaskModal(true)}>
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <ListTodoIcon className="size-4" /> Today Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.todo}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <UsersIcon className="size-4" /> Team Task
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.assigned}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <ClockIcon className="size-4" /> In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.in_progress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircleIcon className="size-4" /> Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.review}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2Icon className="size-4" /> Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.done}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <XCircleIcon className="size-4" /> In Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.cancelled}</div>
            </CardContent>
          </Card>
        </div>

        {view === "table" ? (
        <Card>
          <CardHeader><CardTitle>All Tasks</CardTitle></CardHeader>
          <CardContent>
            <TaskDataTable
              data={tasks}
              onView={(t) => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); }}
              onEdit={(t) => { setSelectedTask(t as unknown as UiTask); setEditOpen(true); }}
              onDelete={(t) => handleDelete(t as Task)}
              searchPlaceholder="Search all tasks..."
              emptyMessage="No tasks found."
              label="task"
            />
          </CardContent>
        </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-6">
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
              onSave={async (updated) => {
                try {
                  const payload: Record<string, unknown> = { _id: updated._id };
                  if (updated.title !== selectedTask?.title) payload.title = updated.title;
                  if (updated.description !== selectedTask?.description) payload.description = updated.description;
                  if (updated.status !== selectedTask?.status) payload.status = updated.status;
                  if (updated.priority !== selectedTask?.priority) payload.priority = updated.priority;
                  if (updated.assigneeId !== selectedTask?.assigneeId) payload.assigneeId = updated.assigneeId;
                  if (updated.dueDate !== selectedTask?.dueDate) payload.dueDate = updated.dueDate;
                  const res = await fetch(`/api/tasks/${updated._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
                  if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    throw new Error(d.error === "Validation failed" ? "Please fill in all required fields." : (d.error || "Save failed"));
                  }
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Failed to save task";
                  toast.error(message);
                  return;
                }
                setTasks((prev) => prev.map((t) => t._id === updated._id ? (updated as unknown as Task) : t));
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
      </main>
    </>
  );
}
