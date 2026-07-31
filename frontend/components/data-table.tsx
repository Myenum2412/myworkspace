"use client"
import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type Table,
  type PaginationState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchIcon,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
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
  hidePageSizeSelector?: boolean;
  hidePagination?: boolean;
  footerAction?: ReactNode;
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
  pageSize = 30,
  getRowProps,
  hideSearchBar,
  showCheckboxes = true,
  hidePageSizeSelector,
  hidePagination,
  footerAction,
  onSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalFilter, setInternalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<Table<TData> | null>(null);

  // All three handlers guard against no-op updates to prevent TanStack Table's
  // synchronous render-time state sync from triggering infinite re-render loops.
  const handleRowSelectionChange = useCallback(
    (updater: Record<string, boolean> | ((old: Record<string, boolean>) => Record<string, boolean>)) => {
      setRowSelection((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
    },
    []
  );

  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      setSorting((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        return next;
      });
    },
    []
  );

  const globalFilter = searchQuery ?? internalFilter;

  const handleFilterChange = useCallback(
    (updater: string | ((old: string) => string)) => {
      if (onSearchChange) {
        // Externally controlled filter: delegate to parent only,
        // never call onSearchChange inside a setState updater.
        const next = typeof updater === "function" ? updater(globalFilter) : updater;
        onSearchChange(next);
      } else {
        // Internally controlled filter: update local state with guard
        setInternalFilter((prev) => {
          const next = typeof updater === "function" ? updater(prev) : updater;
          return prev === next ? prev : next;
        });
      }
    },
    [onSearchChange, globalFilter]
  );

  const checkboxColumn = useMemo<ColumnDef<TData, TValue>>(
    () => ({
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
    }),
    []
  );

  const allColumns = useMemo(
    () => (showCheckboxes ? [checkboxColumn, ...columns] : columns),
    [showCheckboxes, columns, checkboxColumn]
  );

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: handleSortingChange,
    onGlobalFilterChange: handleFilterChange,
    onRowSelectionChange: handleRowSelectionChange,
    onPaginationChange: setPagination,
    state: { sorting, globalFilter, rowSelection, pagination },
    meta,
  });

  tableRef.current = table;

  useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = tableRef.current?.getSelectedRowModel().rows.map((r) => r.original) ?? [];
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, onSelectionChange]);

  const rowCount = table.getFilteredRowModel().rows.length;
  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-2 sm:space-y-3 w-full">
      <div className="border rounded-sm bg-card shadow-sm overflow-hidden w-full">
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
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="pl-9 w-full h-9 text-sm bg-white"
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
                        <div className="flex items-center justify-center size-12 rounded-sm bg-muted">
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

        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {rowCount === 0
              ? "0 items"
              : `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–${Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, rowCount)} of ${rowCount}`}
          </span>
          <div className="flex items-center gap-4">
            {!hidePageSizeSelector && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
                <Select
                  value={String(pagination.pageSize)}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="90">90</SelectItem>
                    <SelectItem value="120">120</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {!hidePagination && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
            {footerAction}
          </div>
        </div>
      </div>
    </div>
  );
}
