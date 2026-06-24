"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsersIcon, Loader2Icon, UserIcon, CheckCircle2Icon, PencilIcon, Trash2Icon, MoreHorizontalIcon, EyeIcon } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { TaskEditForm } from "@/components/task-edit-form";

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
  review: "bg-[#e8ece4] text-[#3a5234]",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-[#e8ece4] text-[#4c6a45]",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export default function TeamTasksPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"cards" | "table">("cards");
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
          const arr = Array.isArray(d) ? d : d.data || [];
          if (arr.length > 0) setTasks(arr);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const assigneeMap = new Map<string, { name: string; avatar: string; tasks: Task[] }>();
  tasks.forEach((t) => {
    const key = t.assigneeId || "unassigned";
    if (!assigneeMap.has(key)) {
      assigneeMap.set(key, { name: t.assigneeName || "Unassigned", avatar: t.assigneeAvatar, tasks: [] });
    }
    assigneeMap.get(key)!.tasks.push(t);
  });

  const assignees = Array.from(assigneeMap.entries()).map(([id, data]) => ({
    id,
    ...data,
    completed: data.tasks.filter((t) => t.status === "done").length,
  }));

  return (
                                <>
                                <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-6" />
            <h1 className="text-2xl font-bold">Team Tasks</h1>
            <Badge variant="secondary" className="ml-auto">{tasks.length} tasks · {assignees.length} members</Badge>
            <div className="flex gap-1 ml-2">
              <Button variant={view === "cards" ? "default" : "outline"} size="sm" onClick={() => setView("cards")}>Cards</Button>
              <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>Table</Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
          ) : tasks.length === 0 ? (
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
                        className="h-1.5 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${a.tasks.length > 0 ? (a.completed / a.tasks.length) * 100 : 0}%` }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {a.tasks.map((t) => (
                        <div key={t._id} className="flex items-start gap-2 rounded-lg border p-2">
                          <CheckCircle2Icon className={`size-4 mt-0.5 shrink-0 ${t.status === "done" ? "text-emerald-500" : "text-muted-foreground"}`} />
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
      </>
      );
}
