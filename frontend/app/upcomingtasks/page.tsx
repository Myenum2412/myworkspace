"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PlusIcon, CalendarClockIcon, ListTodoIcon, UsersIcon, ClockIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon, EyeIcon } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type Task = {
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

const statusStyles: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-amber-100 text-amber-700",
  review: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const statusGroups = ["todo", "in_progress", "review", "done", "cancelled"];

export default function UpcomingTasksPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "table">("table");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const orgId = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (orgId) {
          return fetch(`/api/tasks?orgId=${orgId}`, { credentials: "include" });
        }
        return null;
      })
      .then((res) => res?.json())
      .then((d) => {
        if (d) {
          const all: Task[] = Array.isArray(d) ? d : d.data || [];
          if (all.length > 0) {
            const now = new Date();
            const upcoming = all
              .filter((t) => t.dueDate && new Date(t.dueDate) >= now && t.status !== "done" && t.status !== "cancelled")
              .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
            if (upcoming.length > 0) setTasks(upcoming);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
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

          {loading ? (
            <div className="flex items-center justify-center py-12"><AlertCircleIcon className="size-6 animate-spin text-muted-foreground" /></div>
          ) : tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarClockIcon className="size-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No upcoming tasks. You&apos;re all caught up!</p>
              </CardContent>
            </Card>
          ) : view === "table" ? (
            <><div className="grid gap-4 md:grid-cols-6 mb-6">
              <Card className="bg-gray-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <ListTodoIcon className="size-4" /> Today Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tasks.filter((t) => t.status === "todo").length}</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-50">
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
              <Card className="bg-gray-50">
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Task #</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Delegated By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="w-16">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((t, idx) => (
                        <TableRow key={t._id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">#{idx + 1}</TableCell>
                          <TableCell className="font-medium">{t.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="size-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
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
                          </TableCell>
                          <TableCell><span className="text-sm">{t.creatorName || "—"}</span></TableCell>
                          <TableCell><Badge className={statusStyles[t.status] || ""}>{t.status.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell><Badge className={priorityStyles[t.priority] || ""}>{t.priority}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon className="size-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedTask(t); setViewOpen(true); }}><EyeIcon className="mr-2 size-4" />View</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedTask(t); setEditOpen(true); }}><PencilIcon className="mr-2 size-4" />Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive"><Trash2Icon className="mr-2 size-4" />Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
                              <Badge className={priorityStyles[t.priority] || "" + " shrink-0"}>{t.priority}</Badge>
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
      </SidebarInset>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="p-0 flex flex-col">
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask}
              onEdit={(t) => { setViewOpen(false); setSelectedTask(t); setEditOpen(true); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="p-0 flex flex-col">
          {selectedTask && (
            <TaskEditForm
              task={selectedTask}
              onSave={(updated) => {
                setTasks((prev) => prev.map((t) => t._id === updated._id ? updated : t));
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
    </SidebarProvider>
  );
}
