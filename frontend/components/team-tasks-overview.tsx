"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, ListTodoIcon, SearchIcon, LayoutGridIcon, CalendarIcon, EyeIcon, PencilIcon, Trash2Icon, MoreHorizontalIcon, UsersIcon, ClockIcon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { DataTable } from "@/components/data-table";
import TaskGanttView from "@/components/task-gantt-view";
import Stats07 from "@/components/stats-07";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/dialog-03";
import type { TeamTask } from "@/app/teamtasks/teamtasks-interactive.client";

const statusStyles: Record<string, string> = {
  todo: "bg-gray-200 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export default function TeamTasksOverview({ tasks: initialTasks }: { tasks: TeamTask[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TeamTask[]>(initialTasks);
  const [viewOpen, setViewOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "gantt">("table");
  const [searchQuery, setSearchQuery] = useState("");

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done" && t.status !== "cancelled").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const teamNames = [...new Set(tasks.map((t) => t.teamName || "Unassigned"))];
  const totalTeams = teamNames.length;

  async function handleDeleteTask(taskId: string) {
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
    } catch {
      alert("Network error while deleting task");
    } finally {
      setDeleting(false);
    }
  }

  const filteredTasks = searchQuery
    ? tasks.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.assigneeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.teamName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks;

  const recentTasks = [...filteredTasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const columns: ColumnDef<TeamTask>[] = [
    {
      id: "index",
      header: "Task #",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.index + 1}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: "title",
      header: "Task",
      cell: ({ row }) => <span className="font-medium">{row.getValue("title")}</span>,
    },
    {
      id: "team",
      header: "Team",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <Badge variant="outline" className="text-xs">
            {t.teamName || "Unassigned"}
          </Badge>
        );
      },
    },
    {
      id: "assignee",
      header: "Assigned To",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-2xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
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
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const val = row.getValue("status") as string;
        return <Badge className={statusStyles[val] || ""}>{val.replace(/_/g, " ")}</Badge>;
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const val = row.getValue("priority") as string;
        return <Badge className={priorityStyles[val] || ""}>{val}</Badge>;
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => {
        const val = row.getValue("dueDate") as string | null;
        const status = row.original.status;
        if (!val) return <span className="text-muted-foreground">—</span>;
        const due = new Date(val);
        const now = new Date();
        const isOverdue = due < now && status !== "done" && status !== "cancelled";
        return (
          <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
            {isOverdue
              ? "Overdue"
              : due.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedTask(t); setViewOpen(true); setEditMode(false); }}>
                <EyeIcon className="mr-2 size-4" />View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedTask(t); setViewOpen(true); setEditMode(true); }}>
                <PencilIcon className="mr-2 size-4" />Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DeleteConfirmDialog
                title="Delete Task"
                description="Are you sure you want to delete this task? This action cannot be undone."
                confirmLabel="Delete"
                disabled={deleting}
                onConfirm={() => handleDeleteTask(t._id)}
              >
                <DropdownMenuItem className="text-destructive" disabled={deleting}>
                  <Trash2Icon className="mr-2 size-4" />Delete
                </DropdownMenuItem>
              </DeleteConfirmDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      size: 80,
    },
  ];

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListTodoIcon className="size-5 sm:size-6" />
            <h1 className="text-xl sm:text-2xl font-bold">Team Tasks</h1>
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
          <Button onClick={() => router.push('/createtask')} className="touch-target">
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        <Stats07
          items={[
            { name: 'Total Tasks', value: total, subtitle: 'All team tasks' },
            { name: 'Teams', value: totalTeams, subtitle: 'Active teams' },
            { name: 'Completed', value: completed, subtitle: 'Done tasks' },
            { name: 'Overdue', value: overdue, subtitle: 'Past due date' },
            { name: 'Avg per Team', value: totalTeams > 0 ? Math.round(total / totalTeams) : 0, subtitle: 'Average tasks' },
            { name: 'Completion', value: completionRate, subtitle: '% completed' },
          ]}
        />

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Team Tasks</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <LayoutGridIcon className="mr-2" />
              Table
            </Button>
            <Button
              variant={viewMode === "gantt" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("gantt")}
            >
              <CalendarIcon className="mr-2" />
              Gantt
            </Button>
          </div>
        </div>

        {viewMode === "table" ? (
          <DataTable
            columns={columns}
            data={recentTasks}
            onRowClick={(t) => { setSelectedTask(t); setViewOpen(true); }}
            searchPlaceholder="Search tasks..."
            title="Team Tasks"
            label="task(s)"
            emptyMessage="No team tasks yet."
            emptyIcon={<UsersIcon className="size-6 text-muted-foreground/50" />}
            hideSearchBar
          />
        ) : (
          <div className="flex-1 min-h-0">
            <TaskGanttView
              tasks={tasks}
              onViewTask={(t) => { setSelectedTask(t as unknown as TeamTask); setViewOpen(true); setEditMode(false); }}
            />
          </div>
        )}
      </main>

      {viewOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-[95vw] h-[95vh] bg-card shadow-xl overflow-hidden flex flex-col">
            <TaskDetailedView
              task={selectedTask}
              editable
              onTaskUpdate={(updated) => {
                setTasks((prev) => prev.map((t) => t._id === updated._id ? updated as TeamTask : t));
              }}
              onClose={() => { setViewOpen(false); setEditMode(false); setSelectedTask(null); }}
            />
          </div>
        </div>
      )}
    </>
  );
}
