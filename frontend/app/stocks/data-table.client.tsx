"use client"
import { PackageIcon } from "lucide-react";
import { DataTable as SharedDataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";

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
      searchPlaceholder="Search inventory..."
      label="inventory item(s)"
      emptyMessage="No inventory items yet."
      emptyIcon={<PackageIcon className="size-6 text-muted-foreground/50" />}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      hideSearchBar={hideSearchBar}
    />
  );
}
