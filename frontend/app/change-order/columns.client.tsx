"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { DeleteConfirmDialog } from "@/components/dialog-03";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "@/lib/icons";

export type ChangeOrder = {
  id: string;
  orderNo: string;
  title: string;
  description: string;
  projectId?: string;
  projectName?: string;
  amount: number;
  status: string;
  requestedBy?: string;
  requestedByName?: string;
  reason?: string;
  createdAt: string;
  updatedAt?: string;
};

const statusColorMap: Record<string, string> = {
  Pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Approved: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Rejected: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Completed: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export const columns: ColumnDef<ChangeOrder>[] = [
  {
    id: "sno",
    header: "S.No",
    cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
    enableSorting: false,
    size: 50,
  },
  {
    accessorKey: "orderNo",
    header: "Order No",
    cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("orderNo") || "—"}</span>,
    size: 120,
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => <span className="font-medium text-xs">{row.getValue("title")}</span>,
    size: 180,
  },
  {
    accessorKey: "projectName",
    header: "Project",
    cell: ({ row }) => <span className="text-xs">{row.getValue("projectName") || "—"}</span>,
    size: 140,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="text-xs font-semibold">
        ₹{Number(row.getValue<number>("amount")).toFixed(2)}
      </span>
    ),
    size: 110,
  },
  {
    accessorKey: "requestedByName",
    header: "Requested By",
    cell: ({ row }) => <span className="text-xs">{row.getValue("requestedByName") || "—"}</span>,
    size: 120,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const value = row.getValue<string>("createdAt");
      if (!value) return <span className="text-xs">—</span>;
      return <span className="text-xs">{new Date(value).toLocaleDateString()}</span>;
    },
    size: 100,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = String(row.getValue("status") || "Pending");
      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColorMap[status] || "bg-slate-50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300"}`}
        >
          {status}
        </span>
      );
    },
    size: 100,
  },
];

export function makeActionsCell(
  onView: (order: ChangeOrder) => void,
  onEdit: (order: ChangeOrder) => void,
  onDelete: (order: ChangeOrder) => void | Promise<void>,
): ColumnDef<ChangeOrder> {
  return {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const order = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onView(order)}>
              <Eye className="mr-2 size-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(order)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DeleteConfirmDialog
              title="Delete Change Order"
              description={`Are you sure you want to delete ${order.orderNo || "this change order"}? This action cannot be undone.`}
              onConfirm={() => onDelete(order)}
            >
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DeleteConfirmDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
    size: 70,
  };
}
