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
        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
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
                {tasks.map((t) => (
                  <tr
                    key={t._id}
                    className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white cursor-pointer"
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
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={viewOpen} onOpenChange={(open) => { if (!open) { setViewOpen(false); setSelectedTask(null); } }}>
        <DialogContent className="p-0 flex flex-col sm:max-w-4xl" showCloseButton={false}>
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
