"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiSearchLine,
} from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  title?: string
  searchPlaceholder?: string
  label?: string
  emptyMessage?: string
  emptyIcon?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  title,
  searchPlaceholder = "Search...",
  label = "items",
  emptyMessage = "No results.",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    getRowId: (row: any) => row.id,
    state: { sorting, columnFilters, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const searchValue =
    (table.getColumn("customerName")?.getFilterValue() as string) ?? ""
  const selectedCount = table.getFilteredSelectedRowModel().rows.length
  const totalCount = table.getFilteredRowModel().rows.length
  const pageCount = table.getPageCount()

  return (
    <div className="w-full">
      {title && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="relative">
          <RiSearchLine
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchValue}
            onChange={(event) =>
              table.getColumn("customerName")?.setFilterValue(event.target.value)
            }
            placeholder={searchPlaceholder}
            className="w-52 pl-8 text-sm"
            aria-label="Search"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{totalCount}</span>{" "}
          {totalCount === 1 ? label.replace(/s$/, "") : label}
        </p>
      </div>

      {selectedCount > 0 && (
        <div className="mb-3 flex items-center gap-2 border border-border bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground tabular-nums">
            {selectedCount} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => table.resetRowSelection()}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-muted/40 hover:bg-muted/40"
              >
                {headerGroup.headers.map((header) => {
                  const id = header.column.id
                  return (
                    <TableHead
                      key={header.id}
                      className={`h-9 ${
                        (header.column as any).meta?.className || ""
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={(cell.column as any).meta?.className || ""}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between gap-4 border-t border-border bg-muted/20 px-4 py-2.5">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {totalCount} {totalCount === 1 ? label.replace(/s$/, "") : label}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <RiArrowLeftSLine className="size-3.5" aria-hidden="true" />
            </Button>
            <span className="px-1 text-xs text-muted-foreground tabular-nums">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {Math.max(pageCount, 1)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <RiArrowRightSLine className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
