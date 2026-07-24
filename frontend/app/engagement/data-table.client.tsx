"use client"
import { MessageSquareIcon } from "lucide-react";
import { DataTable as SharedDataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";

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
      searchPlaceholder="Search interaction followups..."
      label="interaction followup(s)"
      emptyMessage="No interaction followups yet."
      emptyIcon={<MessageSquareIcon className="size-6 text-muted-foreground/50" />}
      hideSearchBar={hideSearchBar}
    />
  );
}
