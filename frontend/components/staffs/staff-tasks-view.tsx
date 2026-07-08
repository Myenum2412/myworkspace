"use client"
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ListTodoIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

function TaskViewDialog({ task, open, onOpenChange }: { task: Task | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!task) return null;
  const field = (label: string, value: string | null | undefined) => (
    <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value || "\u2014"}</p>
      </div>
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">{task.title}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field("Assignee", task.assigneeName)}
            {field("Priority", task.priority)}
            {field("Status", task.status.replace(/_/g, " "))}
            {field("Due Date", task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null)}
            {field("Created", new Date(task.createdAt).toLocaleDateString())}
          </div>
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StaffTasksView({ tasks }: { tasks: Task[] }) {
  const [viewTask, setViewTask] = useState<Task | null>(null);

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks allocated yet</p>;
  }

  return (
    <>
      <TaskViewDialog
        task={viewTask}
        open={!!viewTask}
        onOpenChange={(open) => { if (!open) setViewTask(null); }}
      />
      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="table w-full text-sm text-left">
            <thead className="bg-[#f3f4f6]">
              <tr className="border-b bg-[#f3f4f6] text-left text-sm text-gray-900 font-semibold">
                <th className="px-4 py-3.5 font-semibold text-left">Task</th>
                <th className="px-4 py-3.5 font-semibold text-left">Assignee</th>
                <th className="px-4 py-3.5 font-semibold text-left">Priority</th>
                <th className="px-4 py-3.5 font-semibold text-left">Status</th>
                <th className="px-4 py-3.5 font-semibold text-left">Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white cursor-pointer" onClick={() => setViewTask(t)}>
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
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
