"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsersIcon, PlusIcon, LayoutGridIcon, CalendarIcon } from "lucide-react";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { TaskDataTable } from "@/components/task-data-table";
import TaskGanttView from "@/components/task-gantt-view";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export type TeamTask = {
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
  teamId?: string;
  teamName?: string;
  teamHeadName?: string;
};

export default function TeamTasksInteractive({ tasks }: { tasks: TeamTask[] }) {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "gantt">("table");

  const [localTasks, setLocalTasks] = useState<TeamTask[]>(tasks);

  const handleDelete = useCallback(async (t: TeamTask) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await apiFetch(`/api/tasks/${t._id}`, { method: "DELETE" });
      if (res.ok) setLocalTasks((prev) => prev.filter((x) => x._id !== t._id));
    } catch (error) {
      const message = error instanceof TypeError && error.message === "Failed to fetch" ? "Could not connect to server" : error instanceof Error ? error.message : "Could not delete task";
      toast.error(message);
    }
  }, []);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 min-h-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <UsersIcon className="size-5 sm:size-6" />
            <h1 className="text-xl sm:text-2xl font-bold">Team Tasks</h1>
            <Badge variant="secondary" className="text-[10px] sm:text-xs whitespace-nowrap">{localTasks.length} tasks</Badge>
          </div>
          <Button onClick={() => router.push('/createtask')} className="w-full sm:w-auto touch-target">
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        {localTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UsersIcon className="size-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No team tasks found.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-end gap-2">
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
            <div className="flex-1 min-h-0">
              {viewMode === "table"
                ? (
                  <TaskDataTable
                    data={localTasks}
                    onView={(t) => { setSelectedTask(t as TeamTask); setViewOpen(true); }}
                    onEdit={(t) => { setSelectedTask(t as TeamTask); setViewOpen(true); setEditMode(true); }}
                    onDelete={(t) => handleDelete(t as TeamTask)}
                    searchPlaceholder="Search team tasks..."
                    emptyMessage="No team tasks found."
                    label="task"
                    showTeamHead
                  />
                )
                : (
                  <TaskGanttView
                    tasks={localTasks}
                    onViewTask={(t) => { setSelectedTask(t as unknown as TeamTask); setViewOpen(true); setEditMode(false); }}
                  />
                )
              }
            </div>
          </>
        )}
      </main>

      {viewOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-[95vw] h-[95vh] bg-card rounded-xl shadow-xl overflow-hidden flex flex-col">
            <TaskDetailedView
              task={selectedTask}
              editable
              onTaskUpdate={(updated) => {
                setLocalTasks((prev) => prev.map((t) => t._id === updated._id ? (updated as TeamTask) : t));
              }}
              onClose={() => { setViewOpen(false); setEditMode(false); setSelectedTask(null); }}
            />
          </div>
        </div>
      )}

    </>
  );
}
