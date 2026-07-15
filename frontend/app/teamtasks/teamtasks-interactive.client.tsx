"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsersIcon, PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { TaskDataTable } from "@/components/task-data-table";
import { KanbanBoard } from "@/components/kanban-board";
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
  const [view, setView] = useState<"table" | "kanban">("table");
  const [viewOpen, setViewOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);

  const [localTasks, setLocalTasks] = useState<TeamTask[]>(tasks);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    setLocalTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    } catch {
      setLocalTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, status: localTasks.find((x) => x._id === taskId)?.status || t.status } : t));
    }
  }, [setLocalTasks, localTasks]);

  const handleDelete = useCallback(async (t: TeamTask) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await apiFetch(`/api/tasks/${t._id}`, { method: "DELETE" });
      if (res.ok) setLocalTasks((prev) => prev.filter((x) => x._id !== t._id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete task";
      toast.error(message);
    }
  }, []);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 h-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <UsersIcon className="size-5 sm:size-6" />
            <h1 className="text-xl sm:text-2xl font-bold">Team Tasks</h1>
            <Badge variant="secondary" className="text-[10px] sm:text-xs whitespace-nowrap">{localTasks.length} tasks</Badge>
            <div className="flex gap-1">
              <Button variant={view === "table" ? "default" : "outline"} size="sm" className="text-xs px-2" onClick={() => setView("table")}>Table</Button>
              <Button variant={view === "kanban" ? "default" : "outline"} size="sm" className="text-xs px-2" onClick={() => setView("kanban")}>Kanban</Button>
            </div>
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
        ) : view === "table" ? (
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
        ) : (
          <div className="flex-1 min-h-0">
            <KanbanBoard
              tasks={localTasks}
              onStatusChange={handleStatusChange}
              onCardClick={(task) => { setSelectedTask(task as unknown as TeamTask); setViewOpen(true); }}
              statusGroups={["draft", "pending", "in_progress", "submitted", "approved", "completed", "rejected", "cancelled"]}
            />
          </div>
        )}
      </main>

      <Dialog open={viewOpen} onOpenChange={(open) => { if (!open) { setViewOpen(false); setEditMode(false); setSelectedTask(null); } }}>
        <DialogContent className="p-0 flex flex-col sm:max-w-4xl" showCloseButton={false}>
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask}
              editable
              onTaskUpdate={(updated) => {
                setLocalTasks((prev) => prev.map((t) => t._id === updated._id ? (updated as TeamTask) : t));
              }}
              onClose={() => { setViewOpen(false); setEditMode(false); setSelectedTask(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
