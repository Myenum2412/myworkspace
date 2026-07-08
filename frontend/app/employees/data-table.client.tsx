"use client"
import { UsersIcon } from "lucide-react";
import { DataTable as SharedDataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchQuery,
  onSearchChange,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  return (
    <SharedDataTable
      columns={columns}
      data={data}
      onRowClick={onRowClick}
      searchPlaceholder="Search employees..."
      label="employee(s)"
      emptyMessage="No employees found."
      emptyIcon={<UsersIcon className="size-6 text-muted-foreground/50" />}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
    />
  );
}
