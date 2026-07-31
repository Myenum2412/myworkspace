"use client";

import { useMemo } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, RefreshCcwIcon } from "lucide-react";
import { DataTable } from "@/components/data-table";

const statusStyles: Record<string, string> = {
  Completed: "bg-green-100 text-green-700",
  InCompleted: "bg-yellow-100 text-yellow-700",
  Incomplete: "bg-yellow-100 text-yellow-700",
  Pending: "bg-yellow-100 text-yellow-700",
  InReview: "bg-purple-100 text-purple-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
};

const MOCK_REVISIONS = [
  { id: 1, description: "Update dashboard UI colors", status: "InCompleted" },
  { id: 2, description: "Fix login redirect issue", status: "Completed" },
  { id: 3, description: "Add pagination to reports", status: "InCompleted" },
  { id: 4, description: "Refactor API error handling", status: "Completed" },
  { id: 5, description: "Optimize database queries", status: "InCompleted" },
  { id: 6, description: "Update user profile page", status: "Completed" },
  { id: 7, description: "Fix mobile responsive layout", status: "InCompleted" },
  { id: 8, description: "Add export to CSV feature", status: "Completed" },
  { id: 9, description: "Implement dark mode toggle", status: "InCompleted" },
  { id: 10, description: "Migrate to new auth system", status: "InCompleted" },
];

const MAX_ROWS = 8;

interface RevisionRow {
  id: number;
  description: string;
  status: string;
}

export function StaffRecentRevisions() {
  const visible = useMemo(() => MOCK_REVISIONS.slice(0, MAX_ROWS), []);

  const columns = useMemo<ColumnDef<RevisionRow>[]>(() => [
    {
      id: "index",
      header: "Rev #",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.index + 1}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.description}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={statusStyles[row.original.status] || "bg-gray-100 text-gray-700"}>
          {row.original.status}
        </Badge>
      ),
    },
  ], []);

  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        data={visible}
        label="revision(s)"
        emptyMessage="No revisions yet"
        emptyIcon={<RefreshCcwIcon className="size-6 text-muted-foreground/50" />}
        hideSearchBar
        hidePageSizeSelector
        pageSize={MAX_ROWS}
      />
      {MOCK_REVISIONS.length > MAX_ROWS && (
        <Link href="/staffs/reworks">
          <Button variant="ghost" size="sm" className="w-full gap-1 text-sm font-medium">
            View More
            <ChevronRight className="size-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}
