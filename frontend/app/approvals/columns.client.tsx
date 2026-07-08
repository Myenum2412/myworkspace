"use client"
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon, XCircleIcon, MoreHorizontalIcon, EyeIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ApprovalTask = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  creatorId?: string;
  creatorName?: string;
  description?: string;
  createdAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNote?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
};

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-gray-100 text-gray-700 border-gray-300",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant="outline" className={`text-xs font-medium capitalize ${priorityColors[priority] || ""}`}>
      {priority}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "done") {
    return <Badge className="bg-red-900 text-red-700 text-xs font-medium">Approved</Badge>;
  }
  if (status === "cancelled") {
    return <Badge className="bg-red-100 text-red-700 text-xs font-medium">Rejected</Badge>;
  }
  return <Badge className="bg-gray-700 text-gray-700 text-xs font-medium">Pending</Badge>;
}

export const pendingColumns: ColumnDef<ApprovalTask>[] = [
  {
    accessorKey: "title",
    header: "Task",
    cell: ({ row }) => (
      <div>
        <span className="font-medium text-sm">{row.getValue("title")}</span>
        {row.original.description && (
          <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{row.original.description}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => <PriorityBadge priority={row.getValue("priority")} />,
  },
  {
    accessorKey: "assigneeName",
    header: "Assignee",
    cell: ({ row }) => {
      const name = row.getValue("assigneeName") as string;
      return name ? <span className="text-sm">{name}</span> : <span className="text-sm text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const val = row.getValue("dueDate") as string;
      if (!val) return <span className="text-sm text-muted-foreground">—</span>;
      const date = new Date(val);
      const overdue = date < new Date() ? "text-red-600" : "";
      return <span className={`text-sm ${overdue}`}>{date.toLocaleDateString()}</span>;
    },
  },
];

export const approvedColumns: ColumnDef<ApprovalTask>[] = [
  {
    accessorKey: "title",
    header: "Task",
    cell: ({ row }) => (
      <div>
        <span className="font-medium text-sm">{row.getValue("title")}</span>
        {row.original.description && (
          <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{row.original.description}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => <PriorityBadge priority={row.getValue("priority")} />,
  },
  {
    id: "approvedBy",
    header: "Approved By",
    cell: ({ row }) => {
      const task = row.original;
      return task.approvedBy ? (
        <span className="text-sm">{task.approvedBy}</span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      );
    },
  },
  {
    id: "approvedAt",
    header: "Approved At",
    cell: ({ row }) => {
      const val = row.original.approvedAt;
      if (!val) return <span className="text-sm text-muted-foreground">—</span>;
      return <span className="text-sm">{new Date(val).toLocaleDateString()}</span>;
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export const rejectedColumns: ColumnDef<ApprovalTask>[] = [
  {
    accessorKey: "title",
    header: "Task",
    cell: ({ row }) => (
      <div>
        <span className="font-medium text-sm">{row.getValue("title")}</span>
        {row.original.description && (
          <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{row.original.description}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => <PriorityBadge priority={row.getValue("priority")} />,
  },
  {
    accessorKey: "rejectionReason",
    header: "Reason",
    cell: ({ row }) => {
      const reason = row.getValue("rejectionReason") as string;
      return reason ? (
        <span className="text-sm text-muted-foreground truncate max-w-[180px] block">{reason}</span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      );
    },
  },
  {
    id: "rejectedAt",
    header: "Rejected At",
    cell: ({ row }) => {
      const val = row.original.rejectedAt;
      if (!val) return <span className="text-sm text-muted-foreground">—</span>;
      return <span className="text-sm">{new Date(val).toLocaleDateString()}</span>;
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];
