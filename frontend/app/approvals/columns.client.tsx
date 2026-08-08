"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { FileIcon } from "@/lib/icons";

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
  creatorAvatar?: string;
  description?: string;
  createdAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedByAvatar?: string;
  approvedAt?: string;
  approvalNote?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedByAvatar?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  // File-specific fields
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploaderId?: string;
  uploaderName?: string;
  uploaderAvatar?: string;
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
    <Badge
      variant="outline"
      className={`text-xs font-medium capitalize ${priorityColors[priority] || ""}`}
    >
      {priority}
    </Badge>
  );
}

function TypeBadge({ itemType }: { itemType: string }) {
  if (itemType === "file") {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs font-medium">
        <FileIcon className="size-3 mr-1" />
        File
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs font-medium">Task</Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "done" || status === "approved" || status === "completed") {
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
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
              {row.original.description}
            </p>
          )}
          {row.original.fileName && (
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
              {row.original.fileName}
            </p>
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
      const item = row.original;
      const isFile = item.itemType === "file";
      const name = isFile ? item.uploaderName || item.assigneeName : item.assigneeName;
      const avatar = isFile ? item.uploaderAvatar : item.assigneeAvatar;
      if (!name) return <span className="text-sm text-muted-foreground">—</span>;
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0 overflow-hidden">
            {avatar ? (
              // biome-ignore lint/performance/noImgElement: user avatar from auth provider
              <img src={avatar} alt={name} className="size-full object-cover" />
            ) : (
              <span>
                {name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
            )}
          </div>
          <span className="text-sm font-medium truncate">{name}</span>
        </div>
      );
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
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
              {row.original.description}
            </p>
          )}
          {row.original.fileName && (
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
              {row.original.fileName}
            </p>
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
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
              {row.original.description}
            </p>
          )}
          {row.original.fileName && (
            <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
              {row.original.fileName}
            </p>
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
