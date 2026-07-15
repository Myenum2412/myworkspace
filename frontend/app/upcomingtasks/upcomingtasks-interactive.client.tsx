"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, CalendarClockIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { apiFetch } from "@/lib/api";

export type UpcomingTask = {
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

export default function UpcomingTasksInteractive({ initialTasks }: { initialTasks: UpcomingTask[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<UpcomingTask[]>(initialTasks);
  const [view, setView] = useState<"kanban" | "table">("table");
  const [viewOpen, setViewOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<UpcomingTask | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClockIcon className="size-6" />
            <h1 className="text-2xl font-bold">Upcoming Tasks</h1>
            <Badge variant="secondary">{tasks.length} upcoming</Badge>
            <div className="flex gap-1 ml-2">
              <ViewToggle
                options={[{ value: "table", label: "Table" }, { value: "kanban", label: "Kanban" }]}
                value={view}
                onChange={(v) => setView(v as typeof view)}
              />
            </div>
          </div>
          <Button onClick={() => router.push('/createtask')}>
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarClockIcon className="size-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
            </CardContent>
          </Card>
        ) : view === "table" ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold shrink-0">Upcoming Tasks</h2>
              <div className="flex-1 flex justify-center">
                <div className="relative w-full max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search upcoming tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              <span className="text-sm text-muted-foreground shrink-0">{tasks.length} tasks</span>
            </div>
            <div className="flex-1 min-h-0">
              <TaskDataTable
                data={tasks}
                onView={(t) => { setSelectedTask(t as unknown as UpcomingTask); setViewOpen(true); }}
                onEdit={(t) => { setSelectedTask(t as unknown as UpcomingTask); setViewOpen(true); setEditMode(true); }}
                searchPlaceholder="Search upcoming tasks..."
                emptyMessage="No upcoming tasks."
                label="task"
                hideSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onStatusChange={handleStatusChange}
            onCardClick={(task) => { setSelectedTask(task as unknown as UpcomingTask); setViewOpen(true); setEditMode(false); }}
            statusGroups={["draft", "scheduled", "activated", "in_progress", "completed", "cancelled"]}
          />
        )}
      </main>

      <Dialog open={viewOpen} onOpenChange={(open) => { if (!open) { setViewOpen(false); setEditMode(false); setSelectedTask(null); } }}>
        <DialogContent className="p-0 flex flex-col sm:max-w-4xl" showCloseButton={false}>
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask}
              editable
              onTaskUpdate={(updated) => {
                setTasks((prev) => prev.map((t) => t._id === updated._id ? (updated as UpcomingTask) : t));
              }}
              onClose={() => { setViewOpen(false); setEditMode(false); setSelectedTask(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
