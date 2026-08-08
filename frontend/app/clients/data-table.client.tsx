"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable as SharedDataTable } from "@/components/data-table";
import { FolderIcon } from "@/lib/icons";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  hideSearchBar?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  hideSearchBar,
}: DataTableProps<TData, TValue>) {
  return (
    <SharedDataTable
      columns={columns}
      data={data}
      onRowClick={onRowClick}
      searchPlaceholder="Search clients..."
      label="client(s)"
      emptyMessage="No clients yet."
      emptyIcon={<FolderIcon className="size-6 text-muted-foreground/50" />}
      hideSearchBar={hideSearchBar}
    />
  );
}
