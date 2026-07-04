"use client";

import { useState, useMemo } from "react";
import { PlusIcon, CalendarClockIcon, ListTodoIcon, UsersIcon, ClockIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskAllocationModal } from "@/components/task-allocation/task-allocation-modal";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { TaskEditForm } from "@/components/task-edit-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ViewToggle } from "@/components/view-toggle";
import { TaskDataTable } from "@/components/task-data-table";

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

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-700 text-gray-700",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const statusGroups = ["todo", "in_progress", "review", "done", "postponed", "cancelled"];

export default function UpcomingTasksInteractive({ initialTasks }: { initialTasks: UpcomingTask[] }) {
  const [tasks, setTasks] = useState<UpcomingTask[]>(initialTasks);
  const [view, setView] = useState<"kanban" | "table">("table");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<UpcomingTask | null>(null);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
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
          <Button onClick={() => setShowTaskModal(true)}>
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
          <><div className="grid gap-4 md:grid-cols-6 mb-6">
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
            <CardHeader><CardTitle>Upcoming Tasks</CardTitle></CardHeader>
            <CardContent>
              <TaskDataTable
                data={tasks}
                onView={(t) => { setSelectedTask(t as unknown as UpcomingTask); setViewOpen(true); }}
                onEdit={(t) => { setSelectedTask(t as unknown as UpcomingTask); setEditOpen(true); }}
                searchPlaceholder="Search upcoming tasks..."
                emptyMessage="No upcoming tasks."
                label="task"
              />
            </CardContent>
          </Card>
          </>
        ) : (
          <div className="grid gap-4 md:grid-cols-5">
            {statusGroups.map((s) => {
              const items = tasks.filter((t) => t.status === s);
              return (
                <div key={s} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold capitalize">{s.replace(/_/g, " ")}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 min-h-[120px]">
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic px-1">No tasks</p>
                    ) : (
                      items.map((t) => (
                        <div key={t._id} className="rounded-lg border bg-card p-3 space-y-2 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-tight">{t.title}</p>
                            <Badge className={(priorityStyles[t.priority] || "") + " shrink-0"}>{t.priority}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="size-5 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                {t.assigneeAvatar ? (
                                  <img src={t.assigneeAvatar} alt={t.assigneeName} className="size-full object-cover" />
                                ) : (
                                  <span className="text-[8px] font-medium text-muted-foreground">
                                    {(t.assigneeName || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground">{t.assigneeName}</span>
                            </div>
                            {t.dueDate && (
                              <span className="text-[10px] text-muted-foreground">{new Date(t.dueDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask}
              onEdit={(t) => { setViewOpen(false); setSelectedTask(t as UpcomingTask); setEditOpen(true); }}
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
                setTasks((prev) => prev.map((t) => t._id === updated._id ? (updated as UpcomingTask) : t));
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
