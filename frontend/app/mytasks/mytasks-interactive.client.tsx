"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { apiFetch } from "@/lib/api";

type UiTask = {
  _id: string;
  id: string;
  title: string;
  description?: string;
  type: string;
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
  const [searchQuery, setSearchQuery] = useState("");

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
        const res = await apiFetch(`/api/tasks?orgId=${orgId}&type=individual${userId ? `&assigneeId=${userId}` : ""}`);
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

  const handleTaskUpdate = useCallback((updated: UiTask) => {
    setTasks((prev) => prev.map((t) => t._id === updated._id ? updated : t));
  }, [setTasks]);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      await apiFetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {}
  }, [setTasks]);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 h-screen">
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

        {view === "table" ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold shrink-0">Assigned to me</h2>
              <div className="flex-1 flex justify-center">
                <div className="relative w-full max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search my tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              <span className="text-sm text-muted-foreground shrink-0">{myTasks.length} tasks</span>
            </div>
            <div className="flex-1 min-h-0">
              <TaskDataTable
                data={myTasks}
                onView={(t) => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); setEditMode(false); }}
                onEdit={(t) => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); setEditMode(true); }}
                searchPlaceholder="Search my tasks..."
                emptyMessage="No tasks assigned to you."
                label="task"
                hideSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
          </div>
        ) : (
          <KanbanBoard
            tasks={myTasks}
            onStatusChange={handleStatusChange}
            onCardClick={(task) => { setSelectedTask(task as unknown as UiTask); setViewOpen(true); setEditMode(false); }}
            statusGroups={["draft", "assigned", "pending", "in_progress", "completed", "hold", "cancelled", "reopened"]}
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
