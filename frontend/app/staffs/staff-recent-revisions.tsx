"use client";

import { useEffect, useMemo, useState } from "react";
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

const MAX_ROWS = 8;

interface RevisionRow {
  id: number;
  description: string;
  status: string;
}

export function StaffRecentRevisions() {
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/staffs/reworks")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setRevisions((d.revisions || []).map((r: any) => ({ id: r.id, description: r.description, status: r.status }))); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => revisions.slice(0, MAX_ROWS), [revisions]);

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
      {loading ? (
        <div className="flex items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={visible}
          label="revision(s)"
          emptyMessage="No revisions yet"
          emptyIcon={<RefreshCcwIcon className="size-6 text-muted-foreground/50" />}
          hideSearchBar
          hidePageSizeSelector
          hidePagination
          pageSize={MAX_ROWS}
          footerAction={
            revisions.length > MAX_ROWS ? (
              <Link href="/staffs/reworks">
                <Button variant="ghost" size="sm" className="gap-1 text-sm font-medium">
                  View More
                  <ChevronRight className="size-4" />
                </Button>
              </Link>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
