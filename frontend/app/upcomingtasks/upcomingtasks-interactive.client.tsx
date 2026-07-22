"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, CalendarClockIcon, SearchIcon, LayoutGridIcon, CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { TaskDataTable } from "@/components/task-data-table";
import TaskGanttView from "@/components/task-gantt-view";
import { apiFetch } from "@/lib/api";
import Stats07 from "@/components/stats-07";
import { useMemo } from "react";

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
  const [viewOpen, setViewOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<UpcomingTask | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "gantt">("table");

  // Stats summary
  const stats = useMemo(() => {
    const summary: Record<string, number> = {};
    for (const t of tasks) {
      summary[t.status] = (summary[t.status] || 0) + 1;
    }
    return summary;
  }, [tasks]);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClockIcon className="size-6" />
            <h1 className="text-2xl font-bold">Upcoming Tasks</h1>
            <Badge variant="secondary">{tasks.length} upcoming</Badge>
          </div>
          <Button onClick={() => router.push('/createtask')}>
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        {/* Stats Overview */}
        <Stats07
          items={[
            { name: 'Upcoming', value: tasks.length, subtitle: 'Pending due dates' },
            ...Object.entries(stats).slice(0, 5).map(([status, count]) => ({
              name: status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
              value: count,
              subtitle: `${status.replace(/_/g, ' ')} tasks`,
            })),
          ]}
        />

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarClockIcon className="size-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
            </CardContent>
          </Card>
        ) : (
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
              <span className="text-sm text-muted-foreground shrink-0">{tasks.length} tasks</span>
            </div>
            <div className="flex-1 min-h-0">
              {viewMode === "table" ? (
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
              ) : (
                <TaskGanttView
                  tasks={tasks}
                  onViewTask={(t) => { setSelectedTask(t as unknown as UpcomingTask); setViewOpen(true); setEditMode(false); }}
                />
              )}
            </div>
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
                setTasks((prev) => prev.map((t) => t._id === updated._id ? (updated as UpcomingTask) : t));
              }}
              onClose={() => { setViewOpen(false); setEditMode(false); setSelectedTask(null); }}
            />
          </div>
        </div>
      )}

    </>
  );
}
