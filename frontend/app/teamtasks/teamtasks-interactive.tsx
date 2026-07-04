"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsersIcon, UserIcon, PlusIcon, CheckCircle2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { TaskEditForm } from "@/components/task-edit-form";
import { TaskAllocationModal } from "@/components/task-allocation/task-allocation-modal";
import { TaskDataTable } from "@/components/task-data-table";
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
};

const statusStyles: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-red-900 text-red-700",
  review: "bg-gray-700 text-gray-700",
  done: "bg-red-900 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-700 text-gray-700",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export default function TeamTasksInteractive({ tasks }: { tasks: TeamTask[] }) {
  const [view, setView] = useState<"cards" | "table">("table");
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);

  const [localTasks, setLocalTasks] = useState<TeamTask[]>(tasks);

  const handleDelete = useCallback(async (t: TeamTask) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${t._id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) setLocalTasks((prev) => prev.filter((x) => x._id !== t._id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete task";
      toast.error(message);
    }
  }, []);

  const assigneeMap = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string; tasks: TeamTask[] }>();
    localTasks.forEach((t) => {
      const key = t.assigneeId || "unassigned";
      if (!map.has(key)) {
        map.set(key, { name: t.assigneeName || "Unassigned", avatar: t.assigneeAvatar, tasks: [] });
      }
      map.get(key)!.tasks.push(t);
    });
    return map;
  }, [localTasks]);

  const assignees = Array.from(assigneeMap.entries()).map(([id, data]) => ({
    id,
    ...data,
    completed: data.tasks.filter((t) => t.status === "done").length,
  }));

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-6" />
            <h1 className="text-2xl font-bold">Team Tasks</h1>
            <Badge variant="secondary">{localTasks.length} tasks · {assignees.length} members</Badge>
            <div className="flex gap-1 ml-2">
              <Button variant={view === "cards" ? "default" : "outline"} size="sm" onClick={() => setView("cards")}>Cards</Button>
              <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>Table</Button>
            </div>
          </div>
          <Button onClick={() => setShowTaskModal(true)}>
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
          <Card>
            <CardHeader><CardTitle>Team Tasks</CardTitle></CardHeader>
            <CardContent>
              <TaskDataTable
                data={localTasks}
                onView={(t) => { setSelectedTask(t as TeamTask); setViewOpen(true); }}
                onEdit={(t) => { setSelectedTask(t as TeamTask); setEditOpen(true); }}
                onDelete={(t) => handleDelete(t as TeamTask)}
                searchPlaceholder="Search team tasks..."
                emptyMessage="No team tasks found."
                label="task"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignees.map((a) => (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UserIcon className="size-4 text-muted-foreground" />
                    {a.name}
                    <span className="ml-auto text-xs text-muted-foreground font-normal">{a.completed}/{a.tasks.length}</span>
                  </CardTitle>
                  <div className="w-full h-1.5 rounded-full bg-muted mt-1">
                    <div
                      className="h-1.5 rounded-full bg-red-500 transition-all"
                      style={{ width: `${a.tasks.length > 0 ? (a.completed / a.tasks.length) * 100 : 0}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {a.tasks.map((t) => (
                      <div key={t._id} className="flex items-start gap-2 rounded-lg border p-2">
                        <CheckCircle2Icon className={`size-4 mt-0.5 shrink-0 ${t.status === "done" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{t.title}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge className={`${statusStyles[t.status] || ""} text-[10px] px-1.5 py-0`}>{t.status.replace(/_/g, " ")}</Badge>
                            <Badge className={`${priorityStyles[t.priority] || ""} text-[10px] px-1.5 py-0`}>{t.priority}</Badge>
                            {t.dueDate && (
                              <span className="text-[10px] text-muted-foreground">{new Date(t.dueDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask}
              onEdit={(t) => { setViewOpen(false); setSelectedTask(t as TeamTask); setEditOpen(true); }}
              onClose={() => setViewOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
          {selectedTask && (
            <TaskEditForm
              task={selectedTask}
              onSave={(updated) => {
                setLocalTasks((prev) => prev.map((t) => t._id === updated._id ? (updated as TeamTask) : t));
                setEditOpen(false);
                setSelectedTask(null);
              }}
              onCancel={() => setEditOpen(false)}
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
