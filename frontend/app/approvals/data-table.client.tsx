"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable as SharedDataTable } from "@/components/data-table";
import { CheckCheckIcon } from "@/lib/icons";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No results found.",
}: DataTableProps<TData, TValue>) {
  return (
    <SharedDataTable
      columns={columns}
      data={data}
      onRowClick={onRowClick}
      searchPlaceholder="Search..."
      label="item(s)"
      emptyMessage={emptyMessage}
      emptyIcon={<CheckCheckIcon className="size-6 text-muted-foreground/50" />}
    />
  );
}
