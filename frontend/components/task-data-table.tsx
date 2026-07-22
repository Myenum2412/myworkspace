"use client"
import { useMemo } from "react";
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
  AlertCircleIcon,
  ClockIcon,
} from "lucide-react";
import { DataTable } from "@/components/data-table";

export interface TaskRow {
  _id: string;
  id?: string;
  title: string;
  type?: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  createdAt?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  assigneeId?: string;
  creatorName?: string;
  teamHeadName?: string;
}

const COMPLETED_STATUSES = new Set(["completed", "done", "cancelled", "closed"]);

function getDueDateStatus(dueDate?: string | null, status?: string): "overdue" | "due-soon" | "normal" {
  if (!dueDate || COMPLETED_STATUSES.has(status ?? "")) return "normal";
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffMs < 0) return "overdue";
  if (diffDays <= 1) return "due-soon";
  return "normal";
}

interface TaskDataTableProps {
  data: TaskRow[];
  onView?: (task: TaskRow) => void;
  onEdit?: (task: TaskRow) => void;
  onDelete?: (task: TaskRow) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  label?: string;
  title?: string;
  showTeamHead?: boolean;
  hideSearchBar?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

const typeStyles: Record<string, string> = {
  individual: "bg-blue-50 text-blue-700 border-blue-200",
  team: "bg-purple-50 text-purple-700 border-purple-200",
  common: "bg-green-50 text-green-700 border-green-200",
  upcoming: "bg-orange-50 text-orange-700 border-orange-200",
  draft: "bg-gray-50 text-gray-700 border-gray-200",
};

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  todo: "bg-gray-100 text-gray-700",
  assigned: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  submitted: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-green-100 text-green-700",
  done: "bg-green-100 text-green-700",
  hold: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
  reopened: "bg-purple-100 text-purple-700",
  published: "bg-teal-100 text-teal-700",
  accepted: "bg-green-100 text-green-700",
  scheduled: "bg-blue-100 text-blue-700",
  activated: "bg-green-100 text-green-700",
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
  title,
  showTeamHead = false,
  hideSearchBar,
  searchQuery,
  onSearchChange,
}: TaskDataTableProps) {
  const rowProps = useMemo(() => {
    return data.map((row) => {
      const status = getDueDateStatus(row.dueDate, row.status);
      return {
        status,
        className:
          status === "overdue" ? "bg-red-50 hover:bg-red-100/50" :
          status === "due-soon" ? "bg-yellow-50 hover:bg-yellow-100/50" :
          "",
      };
    });
  }, [data]);

  const getRowProps = (row: TaskRow) => {
    const found = rowProps.find((_, i) => data[i] === row);
    return { className: found?.className ?? "" };
  };

  const columns: ColumnDef<TaskRow>[] = [
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
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.title}</span>
          {row.original.type && (
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${typeStyles[row.original.type] || ""}`}>
              {row.original.type}
            </Badge>
          )}
        </div>
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
    ...(showTeamHead
      ? [
          {
            id: "teamHead",
            header: "Team Head",
            cell: ({ row }: { row: { original: TaskRow } }) => (
              <span className="text-sm">{row.original.teamHeadName || "—"}</span>
            ),
          } as ColumnDef<TaskRow>,
        ]
      : []),
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
      cell: ({ row }) => {
        const dueDate = row.original.dueDate;
        const status = getDueDateStatus(dueDate, row.original.status);
        return (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {dueDate ? new Date(dueDate).toLocaleDateString() : "—"}
            </span>
            {status === "overdue" && (
              <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0 gap-1">
                <AlertCircleIcon className="size-3" /> Overdue
              </Badge>
            )}
            {status === "due-soon" && (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px] px-1.5 py-0 gap-1">
                <ClockIcon className="size-3" /> Due Soon
              </Badge>
            )}
          </div>
        );
      },
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
      title={title}
      emptyMessage={emptyMessage}
      emptyIcon={<ListTodoIcon className="size-6 text-muted-foreground/50" />}
      onRowClick={onView ? (row) => onView(row) : undefined}
      hideSearchBar={hideSearchBar}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      getRowProps={getRowProps}
    />
  );
}
