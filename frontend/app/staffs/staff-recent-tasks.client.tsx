"use client";

import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "@/lib/icons";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TaskDetailedView } from "@/components/task-detailed-view";

type Task = {
  _id: string;
  title: string;
  priority: string;
  status: string;
  assigneeId: string;
  assigneeName: string;
  createdAt: string;
  dueDate: string | null;
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-200 text-gray-800",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const COMPLETED_STATUSES = new Set(["completed", "done", "cancelled", "closed", "rejected"]);

function getDueStatus(dueDate: string | null, status: string): "overdue" | "due-soon" | "normal" {
  if (!dueDate || COMPLETED_STATUSES.has(status)) return "normal";
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 86400000) return "due-soon";
  return "normal";
}

const statusStyles: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function StaffRecentTasks({ tasks }: { tasks: Task[] }) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(30);

  const paginated = useMemo(() => {
    const start = page * pageSize;
    return tasks.slice(start, start + pageSize);
  }, [tasks, page, pageSize]);

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
    setPage(0);
  }, []);

  return (
    <>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks allocated yet</p>
      ) : (
        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-premium w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3.5 font-semibold text-left">Task</th>
                  <th className="px-4 py-3.5 font-semibold text-left">Assignee</th>
                  <th className="px-4 py-3.5 font-semibold text-left">Priority</th>
                  <th className="px-4 py-3.5 font-semibold text-left">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-left">Due</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t) => {
                  const dueStatus = getDueStatus(t.dueDate, t.status);
                  const rowClass = dueStatus === "overdue" ? "bg-red-50 hover:bg-red-100/50" : dueStatus === "due-soon" ? "bg-yellow-50 hover:bg-yellow-100/50" : "bg-white hover:bg-slate-50";
                  return (
                  <tr
                    key={t._id}
                    className={`border-b last:border-0 transition-colors cursor-pointer ${rowClass}`}
                    onClick={() => { setSelectedTask(t); setViewOpen(true); }}
                  >
                    <td className="px-4 py-3 text-sm font-medium">{t.title}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t.assigneeName || "Unassigned"}</td>
                    <td className="px-4 py-3">
                      <Badge className={(priorityStyles[t.priority] || "") + ""}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={(statusStyles[t.status] || "") + ""}>
                        {t.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                        {dueStatus === "overdue" && <span className="text-[10px] font-medium text-red-600">(Overdue)</span>}
                        {dueStatus === "due-soon" && <span className="text-[10px] font-medium text-yellow-600">(Due Soon)</span>}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            <span className="text-sm text-muted-foreground">
              {tasks.length === 0
                ? "0 items"
                : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, tasks.length)} of ${tasks.length}`}
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="90">90</SelectItem>
                    <SelectItem value="120">120</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * pageSize >= tasks.length}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={viewOpen} onOpenChange={(open) => { if (!open) { setViewOpen(false); setSelectedTask(null); } }}>
        <DialogContent className="p-0 gap-0 flex flex-col w-screen max-w-none h-screen max-h-none sm:w-[95vw] sm:h-[95vh] sm:rounded-sm sm:m-4" showCloseButton={false}>
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask as any}
              editable
              onClose={() => { setViewOpen(false); setSelectedTask(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
