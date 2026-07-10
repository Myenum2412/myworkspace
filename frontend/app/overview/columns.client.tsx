"use client"
import { ColumnDef } from "@tanstack/react-table";
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
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  MoreHorizontalIcon,
  ListTodoIcon,
} from "lucide-react";

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

export const columns: ColumnDef<Task>[] = [
  {
    id: "checkbox",
    header: () => <Checkbox />,
    cell: () => <Checkbox />,
    enableSorting: false,
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
    cell: ({ row }) => <span className="font-medium">{row.getValue("title")}</span>,
  },
  {
    id: "assignee",
    header: "Assigned To",
    cell: ({ row }) => {
      const t = row.original;
      return (
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
      return val ? (
        <span className="text-muted-foreground">{new Date(val).toLocaleDateString()}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
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
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); }}><EyeIcon className="mr-2 size-4" />View</DropdownMenuItem>
            <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); }}><PencilIcon className="mr-2 size-4" />Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive"><Trash2Icon className="mr-2 size-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    size: 80,
  },
];
