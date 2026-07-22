"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PlusIcon, ListTodoIcon, SearchIcon, ClockIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon,
  UserIcon, UsersIcon, GlobeIcon, FileEditIcon, UserCheckIcon, LayoutGridIcon, CalendarIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaskDetailedView } from "@/components/task-detailed-view";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { TaskDataTable } from "@/components/task-data-table";
import TaskGanttView from "@/components/task-gantt-view";
import { toast } from "sonner";
import { perfLog, perfNow } from "@/lib/perf";
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
};

const TYPE_TABS = [
  { id: "all", label: "All", icon: ListTodoIcon },
  { id: "individual", label: "Individual", icon: UserIcon },
  { id: "team", label: "Team", icon: UsersIcon },
  { id: "upcoming", label: "Upcoming", icon: ClockIcon },
];

const STATUS_ICONS: Record<string, typeof ListTodoIcon> = {
  draft: FileEditIcon, assigned: UserCheckIcon, pending: ClockIcon,
  in_progress: ClockIcon, completed: CheckCircle2Icon, closed: CheckCircle2Icon,
  hold: AlertCircleIcon, cancelled: XCircleIcon, rejected: XCircleIcon,
  reopened: AlertCircleIcon, submitted: AlertCircleIcon, approved: CheckCircle2Icon,
  published: GlobeIcon, accepted: CheckCircle2Icon, scheduled: ClockIcon, activated: UserCheckIcon,
};

export default function AllTasksInteractive({ initialTasks, orgId }: AllTasksProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<UiTask | null>(null);
  const [activeTypeTab, setActiveTypeTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "gantt">("table");

  // Seed React Query with the SSR payload.
  const queryKey = useMemo(() => ["tasks", "all", orgId] as const, [orgId]);
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
        if (activeTypeTab !== "all") params.set("type", activeTypeTab);
        if (statusFilter) params.set("status", statusFilter);
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

  // Refetch when type tab changes
  useEffect(() => { refetch(); }, [activeTypeTab, statusFilter, refetch]);

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

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (activeTypeTab !== "all") {
      result = result.filter((t: UiTask) => t.type === activeTypeTab);
    }
    return result;
  }, [tasks, activeTypeTab]);

  // Status-summary cards
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
      <main className="flex flex-1 flex-col gap-4 p-4 h-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl font-bold">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage tasks across your organization</p>
          </div>
          <Button onClick={() => router.push('/createtask')} className="w-full sm:w-auto touch-target">
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        {/* Type tabs */}
        <Tabs value={activeTypeTab} onValueChange={setActiveTypeTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            {TYPE_TABS.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="gap-1.5 text-xs sm:text-sm">
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.slice(0, 4)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Task Overview */}
        <div className="grid gap-3 grid-cols-6">
          {Object.keys(summary).slice(0, 5).map((s) => {
            const Icon = STATUS_ICONS[s] || ListTodoIcon;
            return (
              <Card key={s} className={cn("cursor-pointer transition-colors", statusFilter === s ? "ring-2 ring-primary" : "")} onClick={() => setStatusFilter(statusFilter === s ? "" : s)}>
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Icon className="size-3" />
                    {s.replace(/_/g, " ")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold">{summary[s]}</div>
                </CardContent>
              </Card>
            );
          })}
          <Card className="bg-card">
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ListTodoIcon className="size-3" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold">{filteredTasks.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold shrink-0 capitalize">{activeTypeTab === "all" ? "All" : activeTypeTab} Tasks</h2>
              <div className="flex-1 flex justify-center">
                <div className="relative w-full max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${activeTypeTab} tasks...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <LayoutGridIcon className="mr-2 size-4" />
                  Table
                </Button>
                <Button
                  variant={viewMode === "gantt" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("gantt")}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  Gantt
                </Button>
              </div>
              <span className="text-sm text-muted-foreground shrink-0">{filteredTasks.length} tasks</span>
            </div>
            <div className="flex-1 min-h-0">
              {viewMode === "table" ? (
                <TaskDataTable
                  data={filteredTasks}
                  onView={(t) => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); }}
                  onEdit={(t) => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); }}
                  onDelete={(t) => handleDelete(t as UiTask)}
                  searchPlaceholder={`Search ${activeTypeTab} tasks...`}
                  emptyMessage={`No ${activeTypeTab} tasks found.`}
                  label="task"
                  hideSearchBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              ) : (
                <TaskGanttView
                  tasks={filteredTasks}
                  onViewTask={(t) => { setSelectedTask(t as unknown as UiTask); setViewOpen(true); }}
                />
              )}
            </div>
          </div>

        <Dialog open={viewOpen} onOpenChange={(open) => { if (!open) { setViewOpen(false); setSelectedTask(null); } }}>
          <DialogContent className="p-0 flex flex-col sm:max-w-4xl max-h-[90vh]" showCloseButton={false}>
            {selectedTask && (
              <TaskDetailedView
                task={selectedTask}
                editable
                onTaskUpdate={(updated) => {
                  setTasks((prev) => prev.map((t) => t._id === updated._id ? updated : t));
                }}
                onClose={() => { setViewOpen(false); setSelectedTask(null); }}
              />
            )}
          </DialogContent>
        </Dialog>

      </main>
    </>
  );
}
