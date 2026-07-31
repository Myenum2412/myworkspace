"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ListTodoIcon, SearchIcon, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { TaskDataTable } from "@/components/task-data-table";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import Stats07 from "@/components/stats-07";
import { useIndustry } from "@/components/industry-provider";
import { CreateTaskPageInteractive } from "@/app/createtask/page-interactive";

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

type Task = {
  _id: string;
  title: string;
  description: string;
  type: string;
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

export type StaffTasksProps = {
  initialTasks: Task[];
  orgId: string;
  sessionUserId?: string;
};

export default function TasksInteractive({ initialTasks, orgId, sessionUserId }: StaffTasksProps) {
  const { t } = useIndustry();
  const queryClient = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<UiTask | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("tasks");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "upcoming" || upcomingTasks.length > 0) return;
    let cancelled = false;
    setUpcomingLoading(true);
    apiFetch("/api/staffs/upcoming-tasks")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.tasks) setUpcomingTasks(d.tasks); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setUpcomingLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, upcomingTasks.length]);

  const queryKey = useMemo(() => ["tasks", "staff", orgId, sessionUserId] as const, [orgId, sessionUserId]);
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

  const COMPLETED_STATUSES = new Set(["completed", "done", "cancelled", "closed", "rejected"]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    let overdue = 0, dueToday = 0, dueWeek = 0;
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const weekEnd = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const t of filteredTasks) {
      counts[t.status] = (counts[t.status] || 0) + 1;

      if (t.dueDate && !COMPLETED_STATUSES.has(t.status)) {
        const due = new Date(t.dueDate);
        if (due < now) overdue++;
        else if (due <= todayEnd) dueToday++;
        else if (due <= weekEnd) dueWeek++;
      }
    }

    return { counts, overdue, dueToday, dueWeek };
  }, [filteredTasks]);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 min-h-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl font-bold">{t("page.staffs.tasks")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t("nav.staffTasks")}</p>
          </div>
          {!showCreateForm && (
            <Button size="sm" className="shrink-0" onClick={() => setShowCreateForm(true)}>
              New Task
            </Button>
          )}
        </div>

        {showCreateForm ? (
          <div className="flex flex-col flex-1 min-h-0 -mx-4 sm:-mx-6 md:-mx-8 -mb-4">
            <CreateTaskPageInteractive onClose={() => setShowCreateForm(false)} onSuccess={() => { setShowCreateForm(false); refetch(); }} />
          </div>
        ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col gap-4 min-h-0 flex-1">
          <TabsList className="border-b border-border rounded-b-none justify-start w-full bg-transparent h-auto p-0 gap-1 max-h-10! *:flex-none">
            <TabsTrigger value="tasks" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Tasks</TabsTrigger>
            <TabsTrigger value="upcoming" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">Upcoming Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-0 flex flex-col gap-4 min-h-0 flex-1">
            <Stats07
              items={[
                { name: "Total Tasks", value: filteredTasks.length, subtitle: "All tasks" },
                { name: "Overdue", value: summary.overdue, subtitle: "Past due date" },
                { name: "Due Today", value: summary.dueToday, subtitle: "Due by today" },
                { name: "Due This Week", value: summary.dueWeek, subtitle: "Due within 7 days" },
                ...Object.entries(summary.counts).map(([status, count]) => ({
                  name: status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                  value: count,
                  subtitle: `${status.replace(/_/g, ' ')} tasks`,
                })),
              ]}
            />

            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-lg font-semibold shrink-0">{t("nav.tasks")}</h2>
                <div className="flex-1 flex justify-center">
                  <div className="relative w-full max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 bg-white"
                    />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground shrink-0">{filteredTasks.length} tasks</span>
              </div>
              <div className="flex-1 min-h-0">
                <TaskDataTable
                  data={filteredTasks}
                  onView={(t) => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); }}
                  onEdit={(t) => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); }}
                  searchPlaceholder="Search tasks..."
                  emptyMessage="No tasks found."
                  label="task"
                  hideSearchBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upcoming" className="mt-0 flex flex-col flex-1 min-h-0">
            {upcomingLoading ? (
              <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>
            ) : upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <ListTodoIcon className="size-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">No upcoming tasks</p>
              </div>
            ) : (
              <UpcomingTasksTable tasks={upcomingTasks} onView={(task) => {
                const matching = filteredTasks.find((ft: UiTask) => ft._id === task._id || ft.id === task._id);
                if (matching) {
                  setSelectedTask(matching as unknown as UiTask);
                  setViewOpen(true);
                }
              }} />
            )}
          </TabsContent>
        </Tabs>
        )}

        {viewOpen && selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-[95vw] h-[95vh] bg-card rounded-sm shadow-xl overflow-hidden flex flex-col">
              <TaskDetailedView
                task={selectedTask}
                sessionUserId={sessionUserId}
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

function UpcomingTasksTable({ tasks, onView }: { tasks: any[]; onView: (task: any) => void }) {
  const [page, setPage] = useState(0);
  const pageSize = 30;
  const paginated = useMemo(() => {
    const start = page * pageSize;
    return tasks.slice(start, start + pageSize);
  }, [tasks, page]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ListTodoIcon className="size-4" />
          Upcoming Tasks ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-sm">
          <table className="table-premium w-full text-sm text-left">
            <thead>
              <tr>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-12">#</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Title</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Priority</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Status</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Assignee</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((task, index) => (
                <tr key={task._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onView(task)}>
                  <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3 font-medium">{task.title}</td>
                  <td className="px-4 py-3">
                    <Badge className={
                      task.priority === "high" ? "bg-red-100 text-red-700" :
                      task.priority === "medium" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }>
                      {task.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{task.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{task.assignee || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            <span className="text-sm text-muted-foreground">
              {tasks.length === 0
                ? "0 items"
                : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, tasks.length)} of ${tasks.length}`}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * pageSize >= tasks.length}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
