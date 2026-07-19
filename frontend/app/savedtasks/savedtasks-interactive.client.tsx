"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, BookmarkIcon, SearchIcon, LayoutGridIcon, CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskDetailedView } from "@/components/task-detailed-view";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskDataTable } from "@/components/task-data-table";
import TaskGanttView from "@/components/task-gantt-view";
import { apiFetch } from "@/lib/api";

export type SavedTask = {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type?: string;
  dueDate: string | null;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
};

export default function SavedTasksInteractive({ initialTasks }: { initialTasks: SavedTask[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<SavedTask[]>(initialTasks);
  const [viewOpen, setViewOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SavedTask | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "gantt">("table");

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 h-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <BookmarkIcon className="size-5 sm:size-6" />
            <h1 className="text-xl sm:text-2xl font-bold">Saved Tasks</h1>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{tasks.length} tasks</Badge>
          </div>
          <Button onClick={() => router.push('/createtask')} className="w-full sm:w-auto touch-target">
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold shrink-0">All Saved Tasks</h2>
              <div className="flex-1 flex justify-center">
                <div className="relative w-full max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search saved tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
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
              <span className="text-sm text-muted-foreground shrink-0">{tasks.length} tasks</span>
            </div>
            <div className="flex-1 min-h-0">
              {viewMode === "table" ? (
                <TaskDataTable
                  data={tasks}
                  onView={(t) => { setSelectedTask(t as unknown as SavedTask); setViewOpen(true); }}
                  onEdit={(t) => { setSelectedTask(t as unknown as SavedTask); setViewOpen(true); setEditMode(true); }}
                  searchPlaceholder="Search saved tasks..."
                  emptyMessage="No saved tasks."
                  label="task"
                  hideSearchBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              ) : (
                <TaskGanttView
                  tasks={tasks}
                  onViewTask={(t) => { setSelectedTask(t as unknown as SavedTask); setViewOpen(true); setEditMode(false); }}
                />
              )}
            </div>
          </div>
      </main>

      <Dialog open={viewOpen} onOpenChange={(open) => { if (!open) { setViewOpen(false); setEditMode(false); setSelectedTask(null); } }}>
        <DialogContent className="p-0 flex flex-col sm:max-w-4xl" showCloseButton={false}>
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

    </>
  );
}
