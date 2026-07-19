"use client"
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon, XCircleIcon, FileIcon } from "lucide-react";

export type ApprovalItem = {
  _id: string;
  itemType: "task" | "file";
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
  // File-specific fields
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploaderId?: string;
  uploaderName?: string;
};

export type ApprovalTask = ApprovalItem;

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

function TypeBadge({ itemType }: { itemType: string }) {
  if (itemType === "file") {
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs font-medium"><FileIcon className="size-3 mr-1" />File</Badge>;
  }
  return <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs font-medium">Task</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "done" || status === "approved") {
    return <Badge className="bg-green-100 text-green-700 text-xs font-medium">Approved</Badge>;
  }
  if (status === "cancelled" || status === "rejected") {
    return <Badge className="bg-red-100 text-red-700 text-xs font-medium">Rejected</Badge>;
  }
  return <Badge className="bg-yellow-100 text-yellow-700 text-xs font-medium">Pending</Badge>;
}

export const pendingColumns: ColumnDef<ApprovalItem>[] = [
  {
    accessorKey: "title",
    header: "Item",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <TypeBadge itemType={row.original.itemType} />
        <div>
          <span className="font-medium text-sm">{row.getValue("title")}</span>
          {row.original.description && (
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{row.original.description}</p>
          )}
          {row.original.fileName && (
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{row.original.fileName}</p>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      if (row.original.itemType === "file") {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return <PriorityBadge priority={row.getValue("priority")} />;
    },
  },
  {
    accessorKey: "assigneeName",
    header: "Submitted By",
    cell: ({ row }) => {
      const name = row.original.itemType === "file"
        ? row.original.uploaderName || row.original.assigneeName
        : row.original.assigneeName;
      return name ? <span className="text-sm">{name}</span> : <span className="text-sm text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "dueDate",
    header: "Date",
    cell: ({ row }) => {
      const val = row.original.itemType === "file" ? row.original.createdAt : row.original.dueDate;
      if (!val) return <span className="text-sm text-muted-foreground">—</span>;
      const date = new Date(val);
      const label = row.original.itemType === "file" ? "Uploaded" : "Due";
      return (
        <div>
          <span className="text-xs text-muted-foreground block">{label}</span>
          <span className="text-sm">{date.toLocaleDateString()}</span>
        </div>
      );
    },
  },
];

export const approvedColumns: ColumnDef<ApprovalItem>[] = [
  {
    accessorKey: "title",
    header: "Item",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <TypeBadge itemType={row.original.itemType} />
        <div>
          <span className="font-medium text-sm">{row.getValue("title")}</span>
          {row.original.description && (
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{row.original.description}</p>
          )}
          {row.original.fileName && (
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{row.original.fileName}</p>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      if (row.original.itemType === "file") {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return <PriorityBadge priority={row.getValue("priority")} />;
    },
  },
  {
    id: "approvedBy",
    header: "Approved By",
    cell: ({ row }) => {
      const item = row.original;
      return item.approvedBy ? (
        <span className="text-sm">{item.approvedBy}</span>
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

export const rejectedColumns: ColumnDef<ApprovalItem>[] = [
  {
    accessorKey: "title",
    header: "Item",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <TypeBadge itemType={row.original.itemType} />
        <div>
          <span className="font-medium text-sm">{row.getValue("title")}</span>
          {row.original.description && (
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{row.original.description}</p>
          )}
          {row.original.fileName && (
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{row.original.fileName}</p>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      if (row.original.itemType === "file") {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return <PriorityBadge priority={row.getValue("priority")} />;
    },
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
