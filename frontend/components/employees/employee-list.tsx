"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee } from "@/app/employees/columns";
import type { SortField, SortDir } from "./employee-types";
import { EmployeeTableRow } from "./employee-table-row";

type EmployeeListProps = {
  filteredCount: number;
  paginatedEmployees: Employee[];
  totalPages: number;
  page: number;
  rowsPerPage: number;
  searchQuery: string;
  hasActiveFilters: boolean;
  sortField: SortField;
  sortDir: SortDir;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  onAdd: () => void;
  onView: (emp: Employee) => void;
  onEdit: (emp: Employee) => void;
  onTerminate: (emp: Employee) => void;
};

function getSortIcon(field: SortField, sortField: SortField, sortDir: SortDir) {
  if (sortField !== field) return <ArrowUpDownIcon className="size-3.5 text-muted-foreground/40" />;
  return sortDir === "asc"
    ? <ArrowUpIcon className="size-3.5 text-foreground" />
    : <ArrowDownIcon className="size-3.5 text-foreground" />;
}

export function EmployeeList({
  filteredCount,
  paginatedEmployees,
  totalPages,
  page,
  rowsPerPage,
  searchQuery,
  hasActiveFilters,
  sortField,
  sortDir,
  onSearchChange,
  onSearchClear,
  onSort,
  onPageChange,
  onRowsPerPageChange,
  onAdd,
  onView,
  onEdit,
  onTerminate,
}: EmployeeListProps) {
  return (
    <>
      <main className="flex flex-1 flex-col gap-0 p-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
              <UsersIcon className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Employees</h1>
              <p className="text-sm text-muted-foreground">
                {filteredCount} {filteredCount === 1 ? "member" : "members"}
                {hasActiveFilters ? " found" : " total"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-center max-w-lg">
            <div className="relative flex-1 bg-white border border-gray-200 rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 border-0 shadow-none focus-visible:ring-0"
              />
              {searchQuery && (
                <button
                  onClick={onSearchClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <Button onClick={onAdd} className="gap-2 shrink-0">
            <PlusIcon className="size-4" />
            Add Employee
          </Button>
        </div>

        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-sm text-left border-collapse" style={{ minWidth: 900 }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#f3f4f6] text-gray-900">
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("name")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Employee {getSortIcon("name", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <span className="text-gray-800">ID</span>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("email")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Email {getSortIcon("email", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("department")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Department {getSortIcon("department", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("designation")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Designation {getSortIcon("designation", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("role")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Role {getSortIcon("role", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("joiningDate")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Joined {getSortIcon("joiningDate", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("status")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Status {getSortIcon("status", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap">
                    <span className="text-gray-800">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 bg-white">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center justify-center size-12 rounded-full bg-muted">
                          <UsersIcon className="size-6 text-muted-foreground/50" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {hasActiveFilters ? "No employees match your filters" : "No employees yet"}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {hasActiveFilters
                              ? "Try adjusting your search or filter criteria"
                              : "Click 'Add Employee' to get started"}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((emp) => (
                    <EmployeeTableRow
                      key={emp.id}
                      employee={emp}
                      onView={onView}
                      onEdit={onEdit}
                      onTerminate={onTerminate}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredCount > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-[#f3f4f6] text-gray-900 sticky bottom-0 z-10">
              <div className="flex items-center gap-2 text-sm text-gray-800">
                <span>Rows per page:</span>
                <Select value={String(rowsPerPage)} onValueChange={(v) => onRowsPerPageChange(Number(v))}>
                  <SelectTrigger className="w-[68px] h-8 text-xs">
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
                  {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filteredCount)} of {filteredCount}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 border-gray-700/30 text-gray-900 hover:bg-black/10 hover:text-black"
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 border-gray-700/30 text-gray-900 hover:bg-black/10 hover:text-black"
                    onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
