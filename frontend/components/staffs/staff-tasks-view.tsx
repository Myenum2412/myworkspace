"use client"
import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ListTodoIcon } from "lucide-react";
import { DataTable } from "@/components/data-table";
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

function TaskViewDialog({ task, open, onOpenChange }: { task: Task | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!task) return null;
  const field = (label: string, value: string | null | undefined) => (
    <div className="flex items-start gap-3 rounded-sm border bg-card px-4 py-3">
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

  const columns: ColumnDef<Task>[] = [
    {
      accessorKey: "title",
      header: "Task",
      cell: ({ row }) => <span className="font-medium">{row.getValue("title")}</span>,
    },
    {
      accessorKey: "assigneeName",
      header: "Assignee",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {(row.getValue("assigneeName") as string) || "Unassigned"}
        </span>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        return (
          <Badge className={priorityStyles[priority] || ""}>
            {priority}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge className={statusStyles[status] || ""}>
            {status.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) => {
        const dueDate = row.getValue("dueDate") as string | null;
        const status = row.original.status;
        const dueStatus = getDueStatus(dueDate, status);
        if (!dueDate) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="flex items-center gap-1">
            {new Date(dueDate).toLocaleDateString()}
            {dueStatus === "overdue" && <span className="text-[10px] font-medium text-red-600">(Overdue)</span>}
            {dueStatus === "due-soon" && <span className="text-[10px] font-medium text-yellow-600">(Due Soon)</span>}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <TaskViewDialog
        task={viewTask}
        open={!!viewTask}
        onOpenChange={(open) => { if (!open) setViewTask(null); }}
      />
      <DataTable
        columns={columns}
        data={tasks}
        label="task(s)"
        emptyMessage="No tasks allocated yet"
        emptyIcon={<ListTodoIcon className="size-6 text-muted-foreground/50" />}
        onRowClick={(task) => setViewTask(task)}
        pageSize={tasks.length}
        showCheckboxes={false}
        hideSearchBar
      />
    </>
  );
}
