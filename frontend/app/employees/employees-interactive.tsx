"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  XIcon,
  ChevronLeftIcon,
} from "lucide-react";
import type { Employee } from "./columns";
import { AddEmployeeForm } from "./add-employee-form";
import { EmployeeList } from "@/components/employees/employee-list";
import { EmployeeDetails } from "@/components/employees/employee-details";
import type { UserInfo, SortField, SortDir, PageView } from "@/components/employees/employee-types";

type EmployeesInteractiveProps = {
  employees: Employee[];
  user: UserInfo;
};

export default function EmployeesInteractive({ employees: initialEmployees, user }: EmployeesInteractiveProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [pageView, setPageView] = useState<PageView>("list");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Table state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Terminate state
  const [terminatingEmployee, setTerminatingEmployee] = useState<Employee | null>(null);
  const [terminateReason, setTerminateReason] = useState("");

  const handleSort = useCallback((field: SortField) => {
    setSortDir((prev) => (sortField === field ? (prev === "asc" ? "desc" : "asc") : "asc"));
    setSortField(field);
  }, [sortField]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(0);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery("");
    setPage(0);
  }, []);

  const handleRowsPerPageChange = useCallback((rows: number) => {
    setRowsPerPage(rows);
    setPage(0);
  }, []);

  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          (e.department || "").toLowerCase().includes(q) ||
          (e.designation || "").toLowerCase().includes(q) ||
          (e.displayId || "").toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((e) => {
        const s = e.status || "offline";
        if (statusFilter === "active") return s === "active" || s === "online";
        if (statusFilter === "inactive") return s === "inactive" || s === "offline";
        if (statusFilter === "on_leave") return s === "on_leave";
        return s === statusFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      const aVal = (a[sortField] || "").toString().toLowerCase();
      const bVal = (b[sortField] || "").toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [employees, searchQuery, statusFilter, sortField, sortDir]);

  const paginatedEmployees = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredEmployees.slice(start, start + rowsPerPage);
  }, [filteredEmployees, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);

  const handleEdit = useCallback((emp: Employee) => {
    setSelectedEmployee(emp);
    setPageView("edit");
  }, []);

  const handleView = useCallback((emp: Employee) => {
    setSelectedEmployee(emp);
    setPageView("view");
  }, []);

  const handleTerminate = useCallback((emp: Employee) => {
    setTerminatingEmployee(emp);
    setTerminateReason("");
  }, []);

  const handleTerminateConfirm = useCallback(async () => {
    if (!terminatingEmployee) return;
    const res = await fetch(`/api/employees/${encodeURIComponent(terminatingEmployee.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "terminated", terminateReason, terminateDate: new Date().toISOString() }),
    });
    if (res.ok) {
      setEmployees((prev) => prev.filter((e) => e.id !== terminatingEmployee.id));
      setTerminatingEmployee(null);
    }
  }, [terminatingEmployee, terminateReason]);

  const refreshEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees((data.data || data || []) as Employee[]);
      }
    } catch {
      // fallback: keep current state
    }
  }, []);

  const handleBack = useCallback(() => {
    setPageView("list");
    setSelectedEmployee(null);
  }, []);

  // ──── OVERLAYS ────
  const terminateOverlay = terminatingEmployee && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-xl shadow-2xl border w-full max-w-md mx-4 p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Terminate Employee</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Are you sure you want to terminate <strong>{terminatingEmployee.name}</strong>?
            </p>
          </div>
          <button
            onClick={() => setTerminatingEmployee(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <div>
          <label className="text-sm font-medium">Reason for termination</label>
          <textarea
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] mt-1.5"
            placeholder="Enter reason..."
            value={terminateReason}
            onChange={(e) => setTerminateReason(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setTerminatingEmployee(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleTerminateConfirm} disabled={!terminateReason.trim()}>
            Terminate
          </Button>
        </div>
      </div>
    </div>
  );

  // ──── ADD EMPLOYEE (FULL SCREEN) ────
  if (pageView === "add") {
    return (
      <main className="flex flex-1 flex-col h-full bg-white">
        <div className="flex items-center gap-3 px-6 py-4 border-b bg-white sticky top-0 z-10 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
            <ChevronLeftIcon className="size-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-lg font-semibold text-black">Add New Employee</h1>
        </div>
        <div className="flex-1 overflow-auto bg-white">
          <div className="max-w-5xl mx-auto py-6 bg-white my-6">
            <AddEmployeeForm
              onCancel={handleBack}
              onEmployeeAdded={() => {
                refreshEmployees();
                handleBack();
              }}
            />
          </div>
        </div>
      </main>
    );
  }

  // ──── VIEW / EDIT EMPLOYEE (FULL SCREEN) ────
  if ((pageView === "edit" || pageView === "view") && selectedEmployee) {
    return (
      <EmployeeDetails
        employee={selectedEmployee}
        isViewMode={pageView === "view"}
        onBack={handleBack}
        onSwitchToEdit={() => setPageView("edit")}
        onSave={() => {
          refreshEmployees();
          handleBack();
        }}
        onCancel={handleBack}
      />
    );
  }

  // ──── MAIN LIST VIEW ────
  return (
    <>
      {terminateOverlay}
      <EmployeeList
        filteredCount={filteredEmployees.length}
        paginatedEmployees={paginatedEmployees}
        totalPages={totalPages}
        page={page}
        rowsPerPage={rowsPerPage}
        searchQuery={searchQuery}
        hasActiveFilters={!!searchQuery || statusFilter !== "all"}
        sortField={sortField}
        sortDir={sortDir}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
        onSort={handleSort}
        onPageChange={setPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        onAdd={() => setPageView("add")}
        onView={handleView}
        onEdit={handleEdit}
        onTerminate={handleTerminate}
      />
    </>
  );
}
