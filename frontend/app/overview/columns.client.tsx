"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { DeleteConfirmDialog } from "@/components/dialog-03";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EyeIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "@/lib/icons";

export type Task = {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  creatorId?: string;
  creatorName?: string;
  createdAt: string;
  isSaved?: boolean;
};

export const statusStyles: Record<string, string> = {
  todo: "bg-gray-200 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export type TaskColumnCallbacks = {
  onView?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
};

export function createColumns(callbacks: TaskColumnCallbacks = {}): ColumnDef<Task>[] {
  const { onView, onEdit, onDelete } = callbacks;

  return [
    {
      id: "index",
      header: "Task #",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">#{row.index + 1}</span>
      ),
      size: 80,
    },
    {
      accessorKey: "title",
      header: "Task",
      cell: ({ row }) => <span className="font-medium">{row.getValue("title")}</span>,
    },
    {
      id: "assignee",
      header: "Assigned To",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-2xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {t.assigneeAvatar ? (
                <img
                  src={t.assigneeAvatar}
                  alt={t.assigneeName}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {(t.assigneeName || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-sm">{t.assigneeName || "—"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "creatorName",
      header: "Delegated By",
      cell: ({ row }) => {
        const val = row.getValue("creatorName") as string;
        return <span className="text-sm">{val || "—"}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const val = row.getValue("status") as string;
        return <Badge className={statusStyles[val] || ""}>{val.replace(/_/g, " ")}</Badge>;
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const val = row.getValue("priority") as string;
        return <Badge className={priorityStyles[val] || ""}>{val}</Badge>;
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => {
        const val = row.getValue("dueDate") as string | null;
        const status = row.original.status;
        if (!val) return <span className="text-muted-foreground">—</span>;
        const due = new Date(val);
        const now = new Date();
        const isOverdue = due < now && status !== "done" && status !== "cancelled";
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <span className={isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"}>
            {isOverdue
              ? diffDays === 0
                ? "Overdue"
                : `Overdue by ${Math.abs(diffDays)}d`
              : due.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const task = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontalIcon className="" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onView?.(task);
                }}
              >
                <EyeIcon className="mr-2 size-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onEdit?.(task);
                }}
              >
                <PencilIcon className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DeleteConfirmDialog
                title="Delete Task"
                description="Are you sure you want to delete this task? This action cannot be undone."
                onConfirm={() => onDelete?.(task)}
              >
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Trash2Icon className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DeleteConfirmDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      size: 80,
    },
  ];
}

// Backward-compat static export (no callbacks)
export const columns = createColumns();
