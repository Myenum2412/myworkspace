"use client";

import { useState, useCallback } from "react";
import { PlusIcon, BookmarkIcon, ListTodoIcon, UsersIcon, ClockIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export type SavedTask = {
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
};

export default function SavedTasksInteractive({ initialTasks }: { initialTasks: SavedTask[] }) {
  const [tasks, setTasks] = useState<SavedTask[]>(initialTasks);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SavedTask | null>(null);

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
            <BookmarkIcon className="size-5 sm:size-6" />
            <h1 className="text-xl sm:text-2xl font-bold">Saved Tasks</h1>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{tasks.length} tasks</Badge>
            <ViewToggle
              options={[{ value: "kanban", label: "Kanban" }, { value: "table", label: "Table" }]}
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
          <><div className="grid gap-4 grid-cols-2 md:grid-cols-6 mb-6">
            <Card className="bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <ListTodoIcon className="size-4" /> Today Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.filter((t) => t.status === "todo").length}</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <UsersIcon className="size-4" /> Team Task
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.filter((t) => t.status === "assigned").length}</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <ClockIcon className="size-4" /> In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.filter((t) => t.status === "in_progress").length}</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircleIcon className="size-4" /> Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.filter((t) => t.status === "review").length}</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle2Icon className="size-4" /> Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.filter((t) => t.status === "done").length}</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <XCircleIcon className="size-4" /> In Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.filter((t) => t.status === "cancelled").length}</div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>All Saved Tasks</CardTitle></CardHeader>
            <CardContent>
              <TaskDataTable
                data={tasks}
                onView={(t) => { setSelectedTask(t as unknown as SavedTask); setViewOpen(true); }}
                onEdit={(t) => { setSelectedTask(t as unknown as SavedTask); setViewOpen(true); setEditMode(true); }}
                searchPlaceholder="Search saved tasks..."
                emptyMessage="No saved tasks."
                label="task"
              />
            </CardContent>
          </Card>
          </>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onStatusChange={handleStatusChange}
            onCardClick={(task) => { setSelectedTask(task as unknown as SavedTask); setViewOpen(true); setEditMode(false); }}
          />
        )}
      </main>

      <Dialog open={viewOpen} onOpenChange={(open) => { if (!open) { setViewOpen(false); setEditMode(false); setSelectedTask(null); } }}>
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask}
              editable
              onTaskUpdate={(updated) => {
                setTasks((prev) => prev.map((t) => t._id === updated._id ? (updated as SavedTask) : t));
              }}
              onClose={() => { setViewOpen(false); setEditMode(false); setSelectedTask(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <TaskAllocationModal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
      />
    </>
  );
}
