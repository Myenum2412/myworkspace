"use client"
import { FolderIcon } from "lucide-react";
import { DataTable as SharedDataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  meta?: Record<string, unknown>;
}

function hexToRgba(hex: string, alpha: number) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const COMPLETED_PROJECT_STATUSES = new Set(["Completed", "Inactive", "Archived"]);

function getProjectDueStatus(row: Record<string, unknown>): "overdue" | "due-soon" | "normal" {
  const deadline = row.deadline as string | null | undefined;
  const status = row.status as string | undefined;
  const progress = row.progress as number | undefined;
  if (!deadline) return "normal";
  if (COMPLETED_PROJECT_STATUSES.has(status ?? "") || (progress ?? 0) >= 100) return "normal";
  const now = new Date();
  const due = new Date(deadline);
  const diffMs = due.getTime() - now.getTime();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 24 * 60 * 60 * 1000) return "due-soon";
  return "normal";
}

export function DataTable<TData, TValue>({
  columns,
  data,
  meta,
}: DataTableProps<TData, TValue>) {
  return (
    <SharedDataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search projects..."
      label="project(s)"
      emptyMessage="No projects yet."
      emptyIcon={<FolderIcon className="size-6 text-muted-foreground/50" />}
      meta={meta}
      getRowProps={(row) => {
        const r = row as Record<string, unknown>;
        const dueStatus = getProjectDueStatus(r);
        const projectColor = r.color as string | undefined;
        let className = r.className as string || "";
        const style: Record<string, string> = {};
        if (dueStatus === "overdue") {
          className += " bg-red-50";
        } else if (dueStatus === "due-soon") {
          className += " bg-yellow-50";
        }
        if (projectColor) {
          style.backgroundColor = hexToRgba(projectColor, 0.15);
          style.borderLeft = `4px solid ${projectColor}`;
        }
        return { className, style };
      }}
    />
  );
}
