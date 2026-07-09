"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, ListTodoIcon, ClockIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskAllocationModal } from "@/components/task-allocation/task-allocation-modal";
import { TaskDetailedView } from "@/components/task-detailed-view";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ViewToggle } from "@/components/view-toggle";
import { KanbanBoard } from "@/components/kanban-board";
import { TaskDataTable } from "@/components/task-data-table";
import { toast } from "sonner";

type UiTask = {
  _id: string;
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  creatorId?: string;
  creatorName?: string;
  orgId: string;
  teamId?: string;
  dueDate?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type MyTasksProps = {
  initialTasks: UiTask[];
  orgId: string;
  userId: string;
};

export default function MyTasksInteractive({ initialTasks, orgId, userId }: MyTasksProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "table">("table");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<UiTask | null>(null);

  // Seed React Query with the SSR payload.
  const queryKey = useMemo(() => ["tasks", orgId] as const, [orgId]);
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !orgId) return;
    seeded.current = true;
    queryClient.setQueryData(queryKey, initialTasks);
  }, [queryClient, queryKey, orgId, initialTasks]);

  const { data: tasks = [], refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!orgId) return [];
      try {
        const res = await fetch(`/api/tasks?orgId=${orgId}`, { credentials: "include" });
        if (!res.ok) return [];
        const d = await res.json();
        return d.data || [];
      } catch { return []; }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    initialData: initialTasks,
  });

  // Auto-refresh on window focus
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [refetch]);

  const setTasks = useCallback(
    (updater: UiTask[] | ((prev: UiTask[]) => UiTask[])) => {
      queryClient.setQueryData(queryKey, (prev: UiTask[] | undefined) => {
        const current = prev ?? [];
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [queryClient, queryKey],
  );

  // Filter to the current user's assigned tasks.
  const myTasks = useMemo(
    () => (userId ? tasks.filter((t: UiTask) => t.assigneeId === userId) : tasks),
    [tasks, userId],
  );

  const summary = useMemo(() => {
    const init = { todo: 0, in_progress: 0, review: 0, done: 0, cancelled: 0 };
    return myTasks.reduce((acc: typeof init, t: UiTask) => {
      if (t.status in init) acc[t.status as keyof typeof init]++;
      return acc;
    }, init);
  }, [myTasks]);

  const handleTaskUpdate = useCallback((updated: UiTask) => {
    setTasks((prev) => prev.map((t) => t._id === updated._id ? updated : t));
  }, [setTasks]);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {}
  }, [setTasks]);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl font-bold">My Tasks</h1>
            <ViewToggle
              options={[{ value: "table", label: "Table" }, { value: "kanban", label: "Kanban" }]}
              value={view}
              onChange={(v) => setView(v as typeof view)}
            />
          </div>
          <Button onClick={() => setShowTaskModal(true)} className="w-full sm:w-auto touch-target">
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-6 mb-6">
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
            <TaskDataTable
              data={myTasks}
              onView={(t) => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); setEditMode(false); }}
              onEdit={(t) => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); setEditMode(true); }}
              searchPlaceholder="Search my tasks..."
              emptyMessage="No tasks assigned to you."
              label="task"
            />
          </CardContent>
        </Card>
        ) : (
          <KanbanBoard
            tasks={myTasks}
            onStatusChange={handleStatusChange}
            onCardClick={(task) => { setSelectedTask(task as unknown as UiTask); setViewOpen(true); setEditMode(false); }}
          />
        )}

        <Dialog open={viewOpen} onOpenChange={(open) => { if (!open) { setViewOpen(false); setSelectedTask(null); } }}>
          <DialogContent className="p-0 flex flex-col sm:max-w-4xl" showCloseButton={false}>
            {selectedTask && (
              <TaskDetailedView
                task={selectedTask}
                editable
                onTaskUpdate={handleTaskUpdate}
                onClose={() => { setViewOpen(false); setSelectedTask(null); }}
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
