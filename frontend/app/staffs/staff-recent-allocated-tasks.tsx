"use client";

import { useMemo } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ListTodoIcon } from "@/lib/icons";
import { DataTable } from "@/components/data-table";

const statusStyles: Record<string, string> = {
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

const MAX_ROWS = 8;

interface AllocatedTaskRow {
  _id: string;
  id?: string;
  title: string;
  status: string;
}

export function StaffRecentAllocatedTasks({ tasks }: { tasks: any[] }) {
  const visible = useMemo(() => tasks.slice(0, MAX_ROWS), [tasks]);

  const columns = useMemo<ColumnDef<AllocatedTaskRow>[]>(() => [
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
      header: "Task title",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={statusStyles[row.original.status] || "bg-gray-100 text-gray-700"}>
          {row.original.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
  ], []);

  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        data={visible}
        label="task(s)"
        emptyMessage="No tasks allocated yet"
        emptyIcon={<ListTodoIcon className="size-6 text-muted-foreground/50" />}
        hideSearchBar
        hidePageSizeSelector
        hidePagination
        pageSize={MAX_ROWS}
        footerAction={
          tasks.length > MAX_ROWS ? (
            <Link href="/staffs/tasks">
              <Button variant="ghost" size="sm" className="gap-1 text-sm font-medium">
                View More
                <ChevronRight className="size-4" />
              </Button>
            </Link>
          ) : undefined
        }
      />
    </div>
  );
}
