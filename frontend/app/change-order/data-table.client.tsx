"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable as SharedDataTable } from "@/components/data-table";
import { ClipboardListIcon } from "@/lib/icons";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  hideSearchBar?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  searchQuery,
  onSearchChange,
  hideSearchBar,
}: DataTableProps<TData, TValue>) {
  return (
    <SharedDataTable
      columns={columns}
      data={data}
      onRowClick={onRowClick}
      searchPlaceholder="Search change orders..."
      label="change order(s)"
      emptyMessage="No change orders yet."
      emptyIcon={<ClipboardListIcon className="size-6 text-muted-foreground/50" />}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      hideSearchBar={hideSearchBar}
    />
  );
}
