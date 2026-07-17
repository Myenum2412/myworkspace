"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XIcon,
  EyeIcon,
  PencilIcon,
} from "lucide-react";
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedEmployees.map((e) => e.id)));
    }
  };

  const allSelected = paginatedEmployees.length > 0 && selectedIds.size === paginatedEmployees.length;

  return (
    <>
      <main className="flex flex-1 flex-col gap-0 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 shrink-0">
              <UsersIcon className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight">Employees</h1>
              <p className="text-sm text-muted-foreground">
                {filteredCount} {filteredCount === 1 ? "member" : "members"}
                {hasActiveFilters ? " found" : " total"}
              </p>
            </div>
          </div>

          <div className="relative w-full max-w-md mx-auto px-4 hidden sm:block">
            <div className="relative bg-white border border-gray-200 rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder=""
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 border-0 shadow-none focus-visible:ring-0 w-full"
              />
              {searchQuery && (
                <button
                  onClick={onSearchClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
          </div>

          <Button onClick={onAdd} className="gap-2 shrink-0 touch-target">
            <PlusIcon className="size-4" />
            Add Employee
          </Button>
        </div>

        {/* Search (mobile) */}
        <div className="relative w-full mb-4 sm:hidden">
          <div className="relative bg-white border border-gray-200 rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder=""
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-10 border-0 shadow-none focus-visible:ring-0 w-full"
            />
            {searchQuery && (
              <button
                onClick={onSearchClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col sm:max-h-[calc(100vh-280px)]">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="table-premium w-full text-sm text-left" style={{ minWidth: 950 }}>
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" className="border-white" />
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("name")} className="inline-flex items-center gap-1.5 text-white-800 transition-colors">
                      Employee {getSortIcon("name", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <span className="text-gray-800">ID</span>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("email")} className="inline-flex items-center gap-1.5 text-white-800  transition-colors">
                      Email {getSortIcon("email", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("department")} className="inline-flex items-center gap-1.5 text-white-800  transition-colors">
                      Department {getSortIcon("department", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("designation")} className="inline-flex items-center gap-1.5 text-white-800  transition-colors">
                      Designation {getSortIcon("designation", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("role")} className="inline-flex items-center gap-1.5 text-white-800  transition-colors">
                      Role {getSortIcon("role", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("joiningDate")} className="inline-flex items-center gap-1.5 text-white-800 hover:text-white transition-colors">
                      Joined {getSortIcon("joiningDate", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => onSort("status")} className="inline-flex items-center gap-1.5 text-white-800 transition-colors">
                      Status {getSortIcon("status", sortField, sortDir)}
                    </button>
                  </th>
                  <th className="text-right font-semibold px-4 py-3.5 text-white-800 whitespace-nowrap">
                    <span className="text-gray-800">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 bg-white">
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
                      selected={selectedIds.has(emp.id)}
                      onToggleSelect={toggleSelect}
                      onView={onView}
                      onEdit={onEdit}
                      onTerminate={onTerminate}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}

        </div>
      </main>
    </>
  );
}
