"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserX, Undo2, Loader2Icon, EyeIcon } from "lucide-react";
import { TerminatedViewDialog } from "@/components/employees/terminated-view-dialog";
import type { TerminatedEmployee } from "../employees/columns";

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export default function TerminatedInteractive({ terminated: initial }: { terminated: TerminatedEmployee[] }) {
  const [terminated, setTerminated] = useState<TerminatedEmployee[]>(initial);
  const [viewEmployee, setViewEmployee] = useState<TerminatedEmployee | null>(null);
  const [reactivateEmp, setReactivateEmp] = useState<TerminatedEmployee | null>(null);
  const [reactivateReason, setReactivateReason] = useState("");
  const [reactivating, setReactivating] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(terminated.length / rowsPerPage);
  const paginatedTerminated = terminated.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const allSelected = paginatedTerminated.length > 0 && paginatedTerminated.every((emp) => selectedRows.has(emp.id));
  const someSelected = paginatedTerminated.some((emp) => selectedRows.has(emp.id));

  function toggleAllRows() {
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedTerminated.map((emp) => emp.id)));
    }
  }

  function toggleRow(id: string) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleReactivateClick(emp: TerminatedEmployee) {
    setReactivateEmp(emp);
    setReactivateReason("");
    setReactivating(false);
  }

  async function handleReactivateConfirm() {
    if (!reactivateEmp) return;
    if (!reactivateReason.trim()) {
      toast.error("Please provide a reason for reactivation");
      return;
    }
    setReactivating(true);

    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(reactivateEmp.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "active", terminateReason: "", terminateDate: null }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reactivate employee");
      }

      setTerminated((prev) => prev.filter((e) => e.id !== reactivateEmp.id));
      toast.success("Employee reactivated successfully");
      setReactivateEmp(null);
      setReactivateReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate employee");
    } finally {
      setReactivating(false);
    }
  }

  if (terminated.length === 0 && initial.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-sm bg-primary/10 shrink-0">
            <UserX className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Terminated</h1>
            <p className="text-sm text-muted-foreground mt-1">Track and manage terminated employees</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white border border-gray-200 shadow-sm min-h-[400px] rounded-lg">
          <div className="flex items-center justify-center size-12 rounded-sm bg-muted">
            <UserX className="size-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mt-4">No terminated employees.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-sm bg-primary/10 shrink-0">
            <UserX className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Terminated</h1>
            <p className="text-sm text-muted-foreground mt-1">Track and manage terminated employees</p>
          </div>
        </div>
        {terminated.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white border border-gray-200 shadow-sm min-h-[400px] rounded-lg">
            <div className="flex items-center justify-center size-12 rounded-sm bg-muted">
              <UserX className="size-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mt-4">No terminated employees.</p>
          </div>
        ) : (
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-sm flex flex-col" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="table-premium w-full text-sm text-left" style={{ minWidth: 900 }}>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3.5 whitespace-nowrap">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAllRows}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">Employee</th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">Department</th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">Role</th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">End Date</th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">Reason</th>
                    <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTerminated.map((emp) => (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white group cursor-pointer" onClick={() => setViewEmployee(emp)}>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedRows.has(emp.id)}
                          onCheckedChange={() => toggleRow(emp.id)}
                          aria-label={`Select ${emp.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt={emp.name} className="size-8 rounded-full object-cover ring-2 ring-background opacity-60" />
                          ) : (
                            <div className="size-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gray-100 text-gray-600 opacity-60">
                              {getInitials(emp.name)}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-900 block">{emp.name}</span>
                            <span className="text-xs text-gray-500 block">{emp.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{emp.department || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{emp.designation || emp.role || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {emp.terminateDate ? new Date(emp.terminateDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-sm border border-gray-200 px-2 py-0.5 text-xs text-gray-600">
                          {emp.terminateReason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setViewEmployee(emp)}
                          >
                            <EyeIcon className="size-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleReactivateClick(emp)}
                          >
                            <Undo2 className="size-3 mr-1" />
                            Reactivate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </main>

      <TerminatedViewDialog
        employee={viewEmployee}
        open={!!viewEmployee}
        onOpenChange={(open) => { if (!open) setViewEmployee(null); }}
      />

      <Dialog
        open={!!reactivateEmp}
        onOpenChange={(o) => { if (!o && !reactivating) { setReactivateEmp(null); setReactivateReason(""); } }}
      >
        <DialogContent className="max-w-[700px] max-h-[85vh] p-6">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center size-12 rounded-sm bg-green-50 border border-green-200">
                <Undo2 className="size-6 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Reactivate Employee</DialogTitle>
                <DialogDescription className="mt-1">
                  Restore employee to active status
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-sm bg-muted/50 border">
              {reactivateEmp?.avatar ? (
                <img src={reactivateEmp.avatar} alt={reactivateEmp.name} className="size-10 rounded-full object-cover ring-2 ring-background" />
              ) : (
                <div className="size-10 rounded-full flex items-center justify-center text-sm font-semibold bg-gray-100 text-gray-600">
                  {getInitials(reactivateEmp?.name || "")}
                </div>
              )}
              <div>
                <p className="font-medium">{reactivateEmp?.name}</p>
                <p className="text-sm text-muted-foreground">{reactivateEmp?.email}</p>
              </div>
            </div>

            <div className="space-y-1.5 px-2">
              <Label className="text-xs text-muted-foreground">Reason for reactivation <span className="text-destructive">*</span></Label>
              <Textarea
                className="flex w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter the reason for reactivating this employee..."
                value={reactivateReason}
                onChange={(e) => setReactivateReason(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Please provide a detailed reason for reactivating this employee.</p>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <div className="flex w-full gap-4 px-2">
              <Button
                variant="outline"
                onClick={() => { setReactivateEmp(null); setReactivateReason(""); }}
                disabled={reactivating}
                className="flex-1 py-3 text-base font-medium"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                disabled={reactivating}
                onClick={handleReactivateConfirm}
                className="flex-1 py-3 text-base font-medium bg-green-600 hover:bg-green-700 text-white"
              >
                {reactivating ? <Loader2Icon className="size-4 animate-spin mr-2" /> : <Undo2 className="size-4 mr-2" />}
                Reactivate Employee
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
