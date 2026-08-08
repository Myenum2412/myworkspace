"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, FolderKanbanIcon } from "@/lib/icons";

const statusStyles: Record<string, string> = {
  FFU: "bg-blue-100 text-blue-700 border-blue-200",
  APP: "bg-green-100 text-green-700 border-green-200",
  "R&R": "bg-amber-100 text-amber-700 border-amber-200",
};

const MAX_ROWS = 6;

interface SubmissionRow {
  id: string;
  projectName: string;
  drawNo: string;
  element: string;
  status: string;
}

export function StaffRecentSubmissions({ tasks = [] }: { tasks?: any[] }) {
  const submissions = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks.slice(0, MAX_ROWS).map((task, index) => ({
      id: String(task.id || task._id || `task-${index}`),
      projectName: task.project || "No project",
      drawNo: task.id || task._id || `#${index + 1}`,
      element: task.title || "Untitled task",
      status: task.status || "todo",
    }));
  }, [tasks]);

  const visible = useMemo(() => submissions.slice(0, MAX_ROWS), [submissions]);

  const columns = useMemo<ColumnDef<SubmissionRow>[]>(
    () => [
      {
        accessorKey: "projectName",
        header: "Project",
        cell: ({ row }) => <span className="font-medium">{row.original.projectName}</span>,
      },
      {
        accessorKey: "drawNo",
        header: "Draw No",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.drawNo}</span>
        ),
        size: 120,
      },
      {
        accessorKey: "element",
        header: "Element",
        cell: ({ row }) => <span>{row.original.element}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            className={
              statusStyles[row.original.status] || "bg-gray-100 text-gray-700 border-gray-200"
            }
          >
            {row.original.status}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        data={visible}
        label="submission(s)"
        emptyMessage="No recent submissions"
        emptyIcon={<FolderKanbanIcon className="size-6 text-muted-foreground/50" />}
        hideSearchBar
        hidePageSizeSelector
        hidePagination
        pageSize={MAX_ROWS}
        footerAction={
          tasks.length > MAX_ROWS ? (
            <Link href="/staffs/submissions">
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
