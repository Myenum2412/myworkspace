"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  MoreHorizontalIcon,
  PencilIcon,
  UserXIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee } from "./columns";
import { EmployeeDetailedView } from "./employee-detailed-view";
import { EmployeeEditForm } from "./employee-edit-form";
import { AddEmployeeForm } from "./add-employee-form";

type UserInfo = {
  name: string;
  email: string;
  avatar: string;
};

type EmployeesInteractiveProps = {
  employees: Employee[];
  user: UserInfo;
};

type SortField = "name" | "email" | "department" | "designation" | "role" | "status" | "joiningDate";
type SortDir = "asc" | "desc";

type PageView = "list" | "add" | "view" | "edit";

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  active:     { label: "Active",     dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400" },
  online:     { label: "Online",     dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400" },
  inactive:   { label: "Inactive",   dot: "bg-slate-400",   bg: "bg-slate-50 dark:bg-slate-900/30",     text: "text-slate-600 dark:text-slate-400" },
  offline:    { label: "Offline",    dot: "bg-slate-400",   bg: "bg-slate-50 dark:bg-slate-900/30",     text: "text-slate-600 dark:text-slate-400" },
  on_leave:   { label: "On Leave",   dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-700 dark:text-amber-400" },
  break:      { label: "Break",      dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-700 dark:text-amber-400" },
  terminated: { label: "Terminated", dot: "bg-red-500",     bg: "bg-red-50 dark:bg-red-950/30",         text: "text-red-700 dark:text-red-400" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
    "bg-pink-100 text-pink-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDownIcon className="size-3.5 text-muted-foreground/40" />;
    return sortDir === "asc"
      ? <ArrowUpIcon className="size-3.5 text-foreground" />
      : <ArrowDownIcon className="size-3.5 text-foreground" />;
  };

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
    setPageView("view"); // unified edit/view form but in read-only mode
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

  // ──── VIEW / EDIT EMPLOYEE (FULL SCREEN) ────
  if ((pageView === "edit" || pageView === "view") && selectedEmployee) {
    return (
      <main className="flex flex-1 flex-col h-full bg-white">
        <div className="flex items-center gap-3 px-6 py-4 border-b bg-white sticky top-0 z-10 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
            <ChevronLeftIcon className="size-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-lg font-semibold text-black">{pageView === "view" ? "Employee Details" : "Edit Employee"}</h1>
        </div>
        <div className="flex-1 overflow-auto bg-white">
          <div className="max-w-5xl mx-auto py-6 bg-white my-6">
            <EmployeeEditForm
              key={selectedEmployee.id}
              employee={selectedEmployee}
              isViewMode={pageView === "view"}
              onSwitchToEdit={() => setPageView("edit")}
              onSave={() => {
                handleBack();
                window.location.reload();
              }}
              onCancel={handleBack}
            />
          </div>
        </div>
      </main>
    );
  }

  // ──── MAIN LIST VIEW ────
  return (
    <>
      <Dialog open={pageView === "add"} onOpenChange={(open) => { if (!open) handleBack(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <div className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold">Add New Employee</DialogTitle>
          </div>
          <div className="p-6">
            <AddEmployeeForm
              onCancel={handleBack}
              onEmployeeAdded={() => {
                handleBack();
                window.location.reload();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Edit dialogs removed as they are now full-screen early returns */}

      {terminateOverlay}
      <main className="flex flex-1 flex-col gap-0 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
              <UsersIcon className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Employees</h1>
              <p className="text-sm text-muted-foreground">
                {filteredEmployees.length} {filteredEmployees.length === 1 ? "member" : "members"}
                {searchQuery || statusFilter !== "all" ? " found" : " total"}
              </p>
            </div>
          </div>

          {/* Center: Search + Filter */}
          <div className="flex items-center gap-3 flex-1 justify-center max-w-lg">
            <div className="relative flex-1 bg-white border border-gray-200 rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-9 h-9 border-0 shadow-none focus-visible:ring-0"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setPage(0); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <Button onClick={() => setPageView("add")} className="gap-2 shrink-0">
            <PlusIcon className="size-4" />
            Add Employee
          </Button>
        </div>

        {/* Table */}
        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-sm" style={{ minWidth: 900 }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#f3f4f6] text-gray-900">
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => handleSort("name")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Employee {getSortIcon("name")}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <span className="text-gray-800">ID</span>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => handleSort("email")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Email {getSortIcon("email")}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => handleSort("department")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Department {getSortIcon("department")}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => handleSort("designation")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Designation {getSortIcon("designation")}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => handleSort("role")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Role {getSortIcon("role")}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => handleSort("joiningDate")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Joined {getSortIcon("joiningDate")}
                    </button>
                  </th>
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => handleSort("status")} className="inline-flex items-center gap-1.5 text-gray-800 hover:text-black transition-colors">
                      Status {getSortIcon("status")}
                    </button>
                  </th>
                  <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap">
                    <span className="text-gray-800">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 bg-white">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center justify-center size-12 rounded-full bg-muted">
                          <UsersIcon className="size-6 text-muted-foreground/50" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {searchQuery || statusFilter !== "all" ? "No employees match your filters" : "No employees yet"}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {searchQuery || statusFilter !== "all"
                              ? "Try adjusting your search or filter criteria"
                              : "Click 'Add Employee' to get started"}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((emp) => {
                    const status = statusConfig[emp.status] || statusConfig.offline;
                    return (
                      <tr
                        key={emp.id}
                        className="group bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => handleView(emp)}
                      >
                        {/* Employee name + avatar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {emp.avatar ? (
                              <img
                                src={emp.avatar}
                                alt={emp.name}
                                className="size-8 rounded-full object-cover ring-2 ring-background"
                              />
                            ) : (
                              <div className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold ${getAvatarColor(emp.name)}`}>
                                {getInitials(emp.name)}
                              </div>
                            )}
                            <span className="font-medium text-gray-900 whitespace-nowrap">
                              {emp.name}
                            </span>
                          </div>
                        </td>

                        {/* ID */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-500">
                            {emp.displayId || "—"}
                          </span>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3">
                          <span className="text-gray-700">{emp.email}</span>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3">
                          {emp.department ? (
                            <span className="inline-flex items-center rounded-md bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
                              {emp.department}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Designation */}
                        <td className="px-4 py-3">
                          <span className="text-gray-800">{emp.designation || <span className="text-gray-300">—</span>}</span>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md border border-gray-200 text-gray-700 px-2 py-0.5 text-xs font-medium capitalize">
                            {emp.role}
                          </span>
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3">
                          <span className="text-gray-500 text-xs">
                            {emp.joiningDate
                              ? new Date(emp.joiningDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "—"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                            <span className={`size-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleView(emp)}>
                              <UsersIcon className="size-3 mr-1" /> View
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleEdit(emp)}>
                              <PencilIcon className="size-3 mr-1" /> Edit
                            </Button>
                            <Button variant="destructive" size="sm" className="h-7 text-xs bg-red-500 hover:bg-red-600 text-white" onClick={() => handleTerminate(emp)}>
                              <UserXIcon className="size-3 mr-1" /> Terminate
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredEmployees.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-[#f3f4f6] text-gray-900 sticky bottom-0 z-10">
              <div className="flex items-center gap-2 text-sm text-gray-800">
                <span>Rows per page:</span>
                <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setPage(0); }}>
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
                  {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filteredEmployees.length)} of {filteredEmployees.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 border-gray-700/30 text-gray-900 hover:bg-black/10 hover:text-black"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 border-gray-700/30 text-gray-900 hover:bg-black/10 hover:text-black"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
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
