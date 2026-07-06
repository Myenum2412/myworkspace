"use client"
import { useState, type ReactNode } from "react";
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
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

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
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalFilter, setInternalFilter] = useState("");

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1" />
        <div className="relative w-full max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <div className="flex-1 flex justify-end text-sm text-muted-foreground">
          {rowCount} {label ?? "item(s)"}
        </div>
      </div>

      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left border-collapse" style={{ minWidth: 900 }}>
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-[#f3f4f6] text-gray-900 border-b">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className={`px-4 py-3.5 font-semibold whitespace-nowrap ${(header.column.columnDef.meta as any)?.className ?? ""}`} style={{ width: header.getSize() }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rowCount ? (
                rows.map((row) => {
                  const rowProps = getRowProps?.(row.original);
                  return (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`bg-white group hover:bg-slate-50 transition-colors ${onRowClick ? "cursor-pointer" : ""} ${rowProps?.className ?? ""}`}
                    style={rowProps?.style}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={`px-4 py-3 ${(cell.column.columnDef.meta as any)?.className ?? ""}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length} className="bg-white">
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      {emptyIcon && (
                        <div className="flex items-center justify-center size-12 rounded-full bg-muted">
                          {emptyIcon}
                        </div>
                      )}
                      <p className="text-sm font-medium text-muted-foreground">
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-[#f3f4f6] text-gray-900 z-10 shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <span>Rows per page:</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="w-[68px] h-8 text-xs bg-white border-gray-300">
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
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-800">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, rowCount)} of {rowCount}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8 border-gray-700/30 text-gray-900 hover:bg-black/10 hover:text-black bg-white"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8 border-gray-700/30 text-gray-900 hover:bg-black/10 hover:text-black bg-white"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
