"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PlusIcon, ListTodoIcon, SearchIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { TaskDataTable } from "@/components/task-data-table";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import Stats07 from "@/components/stats-07";

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
  teamName?: string;
  dueDate?: string | null;
  startDate?: string | null;
  scheduledDate?: string | null;
  activatedAt?: string | null;
  submittedAt?: string | null;
  approvedBy?: string;
  approverName?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
};

export type AllTasksProps = {
  initialTasks: UiTask[];
  orgId: string;
  sessionUserId?: string;
};

export default function AllTasksInteractive({ initialTasks, orgId, sessionUserId }: AllTasksProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<UiTask | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const queryKey = useMemo(() => ["tasks", "my", orgId, sessionUserId] as const, [orgId, sessionUserId]);
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
        const params = new URLSearchParams({ orgId });
        if (sessionUserId) params.set("assigneeId", sessionUserId);
        const res = await apiFetch(`/api/tasks?${params}`);
        if (!res.ok) return [];
        const d = await res.json();
        return d.data || [];
      } catch { return []; }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    initialData: initialTasks,
  });

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

  const filteredTasks = useMemo(() => {
    const seen = new Set<string>();
    return tasks.filter((t: UiTask) => {
      const k = t._id || t.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [tasks]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of filteredTasks) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [filteredTasks]);

  const handleDelete = useCallback(async (t: UiTask) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await apiFetch(`/api/tasks/${t._id}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((x) => x._id !== t._id));
      }
    } catch (error) {
      const msg = error instanceof TypeError && error.message === "Failed to fetch" ? "Could not connect to server" : error instanceof Error ? error.message : "Could not delete task";
      toast.error(msg);
    }
  }, [setTasks]);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 min-h-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl font-bold">My Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Tasks assigned to you and your teams</p>
          </div>
          <div className="flex-1 flex justify-center max-w-md mx-4">
            <div className="relative w-full">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
            </div>
          </div>
          <Button onClick={() => router.push('/createtask')} className="w-full sm:w-auto touch-target">
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        <Stats07
          items={[
            { name: 'Total Tasks', value: filteredTasks.length, subtitle: 'All tasks' },
            ...Object.entries(summary).map(([status, count]) => ({
              name: status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
              value: count,
              subtitle: `${status.replace(/_/g, ' ')} tasks`,
            })),
          ]}
        />

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold shrink-0">All Tasks</h2>
            <span className="text-sm text-muted-foreground shrink-0 ml-auto">{filteredTasks.length} tasks</span>
          </div>
          <div className="flex-1 min-h-0">
            <TaskDataTable
              data={filteredTasks}
              onView={(t) => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); }}
              onEdit={(t) => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); }}
              onDelete={(t) => handleDelete(t as UiTask)}
              searchPlaceholder="Search tasks..."
              emptyMessage="No tasks found."
              label="task"
              hideSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        </div>

        {viewOpen && selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-[95vw] h-[95vh] bg-card rounded-sm shadow-xl overflow-hidden flex flex-col">
              <TaskDetailedView
                task={selectedTask}
                editable
                onTaskUpdate={(updated) => {
                  setTasks((prev) => prev.map((t) => t._id === updated._id ? updated : t));
                }}
                onClose={() => { setViewOpen(false); setSelectedTask(null); }}
              />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
