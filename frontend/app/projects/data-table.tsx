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
        const projectColor = (row as Record<string, unknown>).color as string | undefined;
        if (!projectColor) return {};
        return {
          style: {
            backgroundColor: hexToRgba(projectColor, 0.15),
            borderLeft: `4px solid ${projectColor}`,
          },
        };
      }}
    />
  );
}
