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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  ArrowUpDown,
  ListIcon,
  LayoutGridIcon,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  label?: string;
  meta?: Record<string, unknown>;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  pageSize?: number;
  getRowProps?: (row: TData) => { className?: string; style?: React.CSSProperties };
  mobileCardView?: boolean;
  renderMobileCard?: (row: TData, index: number) => ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  emptyIcon,
  label,
  meta,
  searchQuery,
  onSearchChange,
  pageSize = 10,
  getRowProps,
  mobileCardView,
  renderMobileCard,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalFilter, setInternalFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);

  const globalFilter = searchQuery ?? internalFilter;
  const setGlobalFilter = onSearchChange ?? setInternalFilter;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter },
    initialState: { pagination: { pageSize } },
    meta,
  });

  const rowCount = table.getFilteredRowModel().rows.length;
  const rows = table.getRowModel().rows;
  const showAsCards = isMobile && (mobileCardView || viewMode === "cards");

  useEffect(() => {
    if (isMobile && mobileCardView) {
      setViewMode("cards");
    } else if (!isMobile) {
      setViewMode("table");
    }
  }, [isMobile, mobileCardView]);

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex-1" />
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 w-full h-10 text-sm"
            aria-label={searchPlaceholder}
          />
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {isMobile && mobileCardView && (
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded ${viewMode === "table" ? "bg-muted" : ""}`}
                aria-label="Table view"
              >
                <ListIcon className="size-4" />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded ${viewMode === "cards" ? "bg-muted" : ""}`}
                aria-label="Card view"
              >
                <LayoutGridIcon className="size-4" />
              </button>
            </div>
          )}
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {rowCount} {label ?? "item(s)"}
          </span>
        </div>
      </div>

      {showAsCards ? (
        <div className="space-y-3 pb-4">
          {rowCount ? (
            rows.map((row, idx) => (
              renderMobileCard ? (
                renderMobileCard(row.original, idx)
              ) : (
                <div
                  key={row.id}
                  className="border rounded-lg bg-card p-3 sm:p-4 space-y-2 shadow-sm active:bg-muted/50 transition-colors"
                  onClick={() => onRowClick?.(row.original)}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onRowClick(row.original) } : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const header = cell.column.columnDef.header;
                    const headerText = typeof header === 'function'
                      ? (header as any)({ column: cell.column, header: cell.column.columnDef, table })
                      : header;
                    const labelText = typeof headerText === 'string' ? headerText : cell.column.id;
                    return (
                      <div key={cell.id} className="flex items-start gap-2 text-sm">
                        <span className="font-medium text-muted-foreground shrink-0 min-w-[80px] text-xs uppercase tracking-wider">
                          {labelText}
                        </span>
                        <span className="flex-1 text-right">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              {emptyIcon && (
                <div className="flex items-center justify-center size-12 rounded-full bg-muted">
                  {emptyIcon}
                </div>
              )}
              <p className="text-sm font-medium text-muted-foreground">
                {globalFilter ? `No results match your search.` : emptyMessage}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
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
                          className={`px-3 sm:px-4 py-3 font-semibold whitespace-nowrap text-xs sm:text-sm ${
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
                              <ArrowUpDown className="size-3.5 text-muted-foreground shrink-0" />
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
          {rowCount > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 border-t bg-muted/30">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-muted-foreground">Rows:</span>
                <Select
                  value={String(table.getState().pagination.pageSize)}
                  onValueChange={(v) => table.setPageSize(Number(v))}
                >
                  <SelectTrigger className="w-[60px] sm:w-[68px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                  &ndash;
                  {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, rowCount)}
                  {" of "}
                  {rowCount}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-8"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    aria-label="Previous page"
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-8"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    aria-label="Next page"
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
