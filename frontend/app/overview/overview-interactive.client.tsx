"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, ListTodoIcon, UsersIcon, CheckCircle2Icon, BookmarkIcon, CalendarClockIcon, LayoutGridIcon, CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { EyeIcon, PencilIcon, Trash2Icon, MoreHorizontalIcon } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { columns as baseColumns, type Task } from "./columns";
import TaskGanttView from "@/components/task-gantt-view";
import Stats07 from "@/components/stats-07";

export interface OverviewInteractiveProps {
  tasks: Task[];
  currentUserId: string;
}

export default function OverviewInteractive({ tasks: initialTasks, currentUserId }: OverviewInteractiveProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [viewOpen, setViewOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "gantt">("table");

  const total = tasks.length;
  const myTasks = currentUserId ? tasks.filter((t) => t.assigneeId === currentUserId).length : 0;
  const teamTasks = total - myTasks;
  const savedCount = tasks.filter((t) => t.isSaved).length;
  const upcomingCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done" || t.status === "cancelled") return false;
    return new Date(t.dueDate) >= new Date();
  }).length;
  const completedCount = tasks.filter((t) => t.status === "done").length;
  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  async function handleDeleteTask(taskId: string) {
    if (!confirm("Delete this task? This cannot be undone.")) return;
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
    } catch (e) {
      alert("Network error while deleting task");
    } finally {
      setDeleting(false);
    }
  }

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListTodoIcon className="size-5 sm:size-6" />
            <h1 className="text-xl sm:text-2xl font-bold">Task Overview</h1>
          </div>
          <Button onClick={() => router.push('/createtask')} className="w-full sm:w-auto touch-target">
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        {/* Stats Overview */}
        <Stats07
          items={[
            { name: 'Total Tasks', value: total, subtitle: 'All tasks' },
            { name: 'My Tasks', value: myTasks, subtitle: 'Assigned to you' },
            { name: 'Team Tasks', value: teamTasks, subtitle: 'Assigned to others' },
            { name: 'Saved', value: savedCount, subtitle: 'Bookmarked tasks' },
            { name: 'Upcoming', value: upcomingCount, subtitle: 'Pending due dates' },
            { name: 'Completion', value: completionRate, subtitle: '% completed' },
          ]}
        />

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Recent Tasks</h2>
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
        </div>

        {viewMode === "table" ? (
          <DataTable
            columns={baseColumns.map((col) => ({
              ...col,
              cell: col.id === "actions"
                ? ({ row }: { row: { original: Task } }) => {
                    const t = row.original;
                    return (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedTask(t); setViewOpen(true); }}><EyeIcon className="mr-2 size-4" />View</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedTask(t); setViewOpen(true); setEditMode(true); }}><PencilIcon className="mr-2 size-4" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" disabled={deleting} onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteTask(t._id); }}><Trash2Icon className="mr-2 size-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }
                : col.cell,
            }))}
            data={recentTasks}
            onRowClick={(t) => { setSelectedTask(t); setViewOpen(true); }}
            searchPlaceholder="Search tasks..."
            title="Recent Tasks"
            label="task(s)"
            emptyMessage="No tasks yet."
            emptyIcon={<ListTodoIcon className="size-6 text-muted-foreground/50" />}
          />
        ) : (
          <div className="flex-1 min-h-0">
            <TaskGanttView
              tasks={tasks}
              onViewTask={(t) => { setSelectedTask(t as unknown as Task); setViewOpen(true); setEditMode(false); }}
            />
          </div>
        )}
      </main>

      {viewOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-[95vw] h-[95vh] bg-card rounded-sm shadow-xl overflow-hidden flex flex-col">
            <TaskDetailedView
              task={selectedTask}
              editable
              onTaskUpdate={(updated) => {
                setTasks((prev) => prev.map((t) => t._id === updated._id ? updated : t));
              }}
              onClose={() => { setViewOpen(false); setEditMode(false); setSelectedTask(null); }}
            />
          </div>
        </div>
      )}

    </>
  );
}
