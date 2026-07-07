"use client"
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontalIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  ListTodoIcon,
  CalendarIcon,
} from "lucide-react";
import { DataTable } from "@/components/data-table";

export interface TaskRow {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  assigneeName?: string;
  assigneeAvatar?: string;
  creatorName?: string;
}

interface TaskDataTableProps {
  data: TaskRow[];
  onView?: (task: TaskRow) => void;
  onEdit?: (task: TaskRow) => void;
  onDelete?: (task: TaskRow) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  label?: string;
}

const statusStyles: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export function TaskDataTable({
  data,
  onView,
  onEdit,
  onDelete,
  searchPlaceholder = "Search tasks...",
  emptyMessage = "No tasks found.",
  label = "task",
}: TaskDataTableProps) {
  const columns: ColumnDef<TaskRow>[] = [
    {
      id: "select",
      header: () => <Checkbox />,
      cell: () => <Checkbox />,
      size: 40,
    },
    {
      id: "index",
      header: "Task #",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.index + 1}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: "title",
      header: "Task",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      id: "assignee",
      header: "Assigned To",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {row.original.assigneeAvatar ? (
              <img
                src={row.original.assigneeAvatar}
                alt={row.original.assigneeName}
                className="size-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground">
                {(row.original.assigneeName || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-sm">{row.original.assigneeName || "—"}</span>
        </div>
      ),
    },
    {
      id: "creator",
      header: "Delegated By",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.creatorName || "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={statusStyles[row.original.status] || ""}>
          {row.original.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge className={priorityStyles[row.original.priority] || ""}>
          {row.original.priority}
        </Badge>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.dueDate
            ? new Date(row.original.dueDate).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={() => onView(row.original)}>
                <EyeIcon className="mr-2 size-4" />
                View
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <PencilIcon className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onView && onEdit && <DropdownMenuSeparator />}
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(row.original)}
              >
                <Trash2Icon className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 64,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder={searchPlaceholder}
      label={`${label}(s)`}
      emptyMessage={emptyMessage}
      emptyIcon={<ListTodoIcon className="size-6 text-muted-foreground/50" />}
      onRowClick={onView ? (row) => onView(row) : undefined}
      mobileCardView={true}
      renderMobileCard={(task: TaskRow) => (
        <div
          className="border rounded-lg bg-card p-3 space-y-2 shadow-sm active:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => onView?.(task)}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-sm flex-1 line-clamp-2">{task.title}</span>
            <div className="flex items-center gap-1 shrink-0">
              <Badge className={`text-[10px] px-1.5 py-0.5 ${statusStyles[task.status] || ""}`}>
                {task.status.replace(/_/g, " ")}
              </Badge>
              <Badge className={`text-[10px] px-1.5 py-0.5 ${priorityStyles[task.priority] || ""}`}>
                {task.priority}
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="size-5 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {task.assigneeAvatar ? (
                  <img src={task.assigneeAvatar} alt={task.assigneeName} className="size-full object-cover" />
                ) : (
                  <span className="text-[8px] font-medium">
                    {(task.assigneeName || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="truncate">{task.assigneeName || "\u2014"}</span>
            </div>
            {task.dueDate && (
              <span className="shrink-0 ml-2">{new Date(task.dueDate).toLocaleDateString()}</span>
            )}
          </div>
          <div className="flex items-center justify-end gap-1 pt-1 border-t border-border">
            {onView && (
              <Button variant="ghost" size="icon-sm" className="size-7" onClick={(e) => { e.stopPropagation(); onView(task); }}>
                <EyeIcon className="size-3.5" />
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" size="icon-sm" className="size-7" onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
                <PencilIcon className="size-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon-sm" className="size-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(task); }}>
                <Trash2Icon className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    />
  );
}
