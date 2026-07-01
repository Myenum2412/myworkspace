"use client"
import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  ListTodoIcon,
} from "lucide-react";

export interface TaskRow {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  assigneeName?: string;
  assigneeAvatar?: string;
  creatorName?: string;
}

interface TaskDataTableProps {
  data: TaskRow[];
  onView?: (task: TaskRow) => void;
  onEdit?: (task: TaskRow) => void;
  onDelete?: (task: TaskRow) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  label?: string;
}

const statusStyles: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-red-900 text-red-700",
  review: "bg-gray-700 text-gray-700",
  done: "bg-red-900 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-700 text-gray-700",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export function TaskDataTable({
  data,
  onView,
  onEdit,
  onDelete,
  searchPlaceholder = "Search tasks...",
  emptyMessage = "No tasks found.",
  label = "task",
}: TaskDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  const columns: ColumnDef<TaskRow>[] = [
    {
      id: "select",
      header: () => <Checkbox />,
      cell: () => <Checkbox />,
      size: 40,
    },
    {
      id: "index",
      header: "Task #",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.index + 1}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: "title",
      header: "Task",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      id: "assignee",
      header: "Assigned To",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {row.original.assigneeAvatar ? (
              <img
                src={row.original.assigneeAvatar}
                alt={row.original.assigneeName}
                className="size-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground">
                {(row.original.assigneeName || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-sm">{row.original.assigneeName || "—"}</span>
        </div>
      ),
    },
    {
      id: "creator",
      header: "Delegated By",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.creatorName || "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={statusStyles[row.original.status] || ""}>
          {row.original.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge className={priorityStyles[row.original.priority] || ""}>
          {row.original.priority}
        </Badge>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.dueDate
            ? new Date(row.original.dueDate).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={() => onView(row.original)}>
                <EyeIcon className="mr-2 size-4" />
                View
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <PencilIcon className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onView && onEdit && <DropdownMenuSeparator />}
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(row.original)}
              >
                <Trash2Icon className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 64,
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: { sorting, globalFilter, rowSelection },
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} {label}(s)
        </div>
      </div>

      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left border-collapse" style={{ minWidth: 900 }}>
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-[#f3f4f6] text-gray-900 border-b">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3.5 font-semibold whitespace-nowrap" style={{ width: header.getSize() }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="bg-white group hover:bg-slate-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="bg-white">
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="flex items-center justify-center size-12 rounded-full bg-muted">
                        <ListTodoIcon className="size-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {globalFilter ? `No ${label}s match your search.` : emptyMessage}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      {table.getFilteredRowModel().rows.length > 0 && (
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
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of {table.getFilteredRowModel().rows.length}
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
