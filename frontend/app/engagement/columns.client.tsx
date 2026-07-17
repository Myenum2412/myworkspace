"use client"
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Engagement = {
  id: string;
  date: string;
  customerName: string;
  contact: string;
  source: string;
  status: string;
  assignedTo: string;
  followUpDate: string;
  remarks: string;
};

const statusColorMap: Record<string, string> = {
  "New": "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Contacted": "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "Qualified": "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Proposal": "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "Won": "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Lost": "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const columns: ColumnDef<Engagement>[] = [
  {
    id: "sno",
    header: "S.No",
    cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => <span>{row.getValue("date") || "—"}</span>,
  },
  {
    accessorKey: "customerName",
    header: "Customer Name",
    cell: ({ row }) => <span className="font-medium">{row.getValue("customerName")}</span>,
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }) => <span>{row.getValue("contact") || "—"}</span>,
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => <span>{row.getValue("source") || "—"}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue<string>("status");
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColorMap[status] || "bg-gray-100 text-gray-700"}`}>
          {status || "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "assignedTo",
    header: "Assigned To",
    cell: ({ row }) => <span>{row.getValue("assignedTo") || "—"}</span>,
  },
  {
    accessorKey: "followUpDate",
    header: "Follow-up Date",
    cell: ({ row }) => <span>{row.getValue("followUpDate") || "—"}</span>,
  },
  {
    accessorKey: "remarks",
    header: "Remarks",
    cell: ({ row }) => {
      const remarks = row.getValue<string>("remarks");
      return (
        <span className="max-w-[200px] truncate block" title={remarks}>
          {remarks || "—"}
        </span>
      );
    },
  },
];

export function makeActionsCell(
  onView: (engagement: Engagement) => void,
  onEdit: (engagement: Engagement) => void,
  onDelete: (engagement: Engagement) => void,
): ColumnDef<Engagement> {
  return {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const engagement = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onView(engagement)}>
              <Eye className="mr-2 size-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(engagement)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(engagement)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  };
}
