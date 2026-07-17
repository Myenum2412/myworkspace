"use client"
import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SearchIcon,
  ArrowUpDown,
} from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  label?: string;
  title?: string;
  meta?: Record<string, unknown>;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  pageSize?: number;
  getRowProps?: (row: TData) => { className?: string; style?: React.CSSProperties };
  hideSearchBar?: boolean;
  showCheckboxes?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  emptyIcon,
  label,
  title,
  meta,
  searchQuery,
  onSearchChange,
  pageSize = 10,
  getRowProps,
  hideSearchBar,
  showCheckboxes = true,
  onSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalFilter, setInternalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const globalFilter = searchQuery ?? internalFilter;
  const setGlobalFilter = onSearchChange ?? setInternalFilter;

  const checkboxColumn: ColumnDef<TData, TValue> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  };

  const allColumns = showCheckboxes ? [checkboxColumn, ...columns] : columns;

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: { sorting, globalFilter, rowSelection },
    initialState: { pagination: { pageSize } },
    meta,
  });

  useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, table, onSelectionChange]);

  const rowCount = table.getFilteredRowModel().rows.length;
  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        {!hideSearchBar && (
          <div className="bg-muted/30 px-3 sm:px-4 py-2.5 sm:py-3 border-b">
            <div className="flex items-center gap-4">
              {title && (
                <span className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">
                  {title}
                </span>
              )}
              <div className="relative w-full max-w-md mx-auto">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9 w-full h-9 text-sm"
                  aria-label={searchPlaceholder}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {rowCount} {label ?? "item(s)"}
                </span>
              </div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto" ref={scrollRef}>
          <table className="table-premium w-full text-sm text-left">
            <thead className="sticky top-0 z-10 bg-primary text-white">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        className={`px-3 sm:px-4 py-3 font-semibold whitespace-nowrap text-xs sm:text-sm text-white ${
                          canSort ? "cursor-pointer select-none hover:bg-muted/80" : ""
                        } ${(header.column.columnDef.meta as any)?.className ?? ""}`}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                        onClick={header.column.getToggleSortingHandler()}
                        aria-sort={
                          header.column.getIsSorted() === "asc" ? "ascending" :
                          header.column.getIsSorted() === "desc" ? "descending" : undefined
                        }
                      >
                        <div className="flex items-center gap-1">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <ArrowUpDown className="size-3.5 text-white shrink-0" />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {rowCount ? (
                rows.map((row) => {
                  const rowProps = getRowProps?.(row.original);
                  return (
                    <tr
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={`bg-card group hover:bg-muted/30 transition-colors ${
                        onRowClick ? "cursor-pointer" : ""
                      } ${rowProps?.className ?? ""}`}
                      style={rowProps?.style}
                      onClick={() => onRowClick?.(row.original)}
                      role={onRowClick ? "button" : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onRowClick(row.original) } : undefined}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm ${
                            (cell.column.columnDef.meta as any)?.className ?? ""
                          }`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-3">
                      {emptyIcon && (
                        <div className="flex items-center justify-center size-12 rounded-full bg-muted">
                          {emptyIcon}
                        </div>
                      )}
                      <p className="text-sm font-medium text-muted-foreground text-center px-4">
                        {globalFilter ? `No results match your search.` : emptyMessage}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
