"use client"
import { DataTable as SharedDataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { type ReactNode } from "react";
import { FileTextIcon } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  renderMobileCard?: (row: TData, index: number) => ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  renderMobileCard,
}: DataTableProps<TData, TValue>) {
  return (
    <SharedDataTable
      columns={columns}
      data={data}
      onRowClick={onRowClick}
      searchPlaceholder="Search invoices..."
      label="invoice(s)"
      emptyMessage="No invoices yet."
      emptyIcon={<FileTextIcon className="size-6 text-muted-foreground/50" />}
      mobileCardView={true}
      renderMobileCard={renderMobileCard}
    />
  );
}
