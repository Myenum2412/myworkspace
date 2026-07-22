"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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

  return (
    <>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks allocated yet</p>
      ) : (
        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-sm">
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
                {tasks.map((t) => {
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
