"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserX, Undo2, Loader2Icon, ChevronLeftIcon, ChevronRightIcon, EyeIcon } from "lucide-react";
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

  const totalPages = Math.ceil(terminated.length / rowsPerPage);
  const paginatedTerminated = terminated.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  function handleReactivateClick(emp: TerminatedEmployee) {
    setReactivateEmp(emp);
    setReactivateReason("");
    setReactivating(false);
  }

  async function handleReactivateConfirm() {
    if (!reactivateEmp) return;
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
        <div>
          <h1 className="text-2xl font-bold">Terminated</h1>
          <p className="text-sm text-muted-foreground mt-1">0 former employees</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white border border-gray-200 shadow-sm min-h-[400px]">
          <div className="flex items-center justify-center size-12 rounded-full bg-muted">
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
        <div>
          <h1 className="text-2xl font-bold">Terminated</h1>
          <p className="text-sm text-muted-foreground mt-1">{terminated.length} former employees</p>
        </div>
        {terminated.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white border border-gray-200 shadow-sm min-h-[400px]">
            <div className="flex items-center justify-center size-12 rounded-full bg-muted">
              <UserX className="size-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mt-4">No terminated employees.</p>
          </div>
        ) : (
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg flex flex-col" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="table-premium w-full text-sm text-left" style={{ minWidth: 900 }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f3f4f6] text-gray-900">
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
                        <span className="inline-flex items-center rounded-md border border-gray-200 px-2 py-0.5 text-xs text-gray-600">
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
            {terminated.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-[#f3f4f6] text-gray-900 sticky bottom-0 z-10">
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <span>Rows per page:</span>
                  <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setPage(0); }}>
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
                    {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, terminated.length)} of {terminated.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 border-gray-700/30 text-gray-900 hover:bg-black/10 hover:text-black bg-white"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeftIcon className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 border-gray-700/30 text-gray-900 hover:bg-black/10 hover:text-black bg-white"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Employee</DialogTitle>
            <DialogDescription>
              This will move {reactivateEmp?.name} back to the active employees list.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-muted-foreground">Reason for reactivation</Label>
            <Textarea
              className="mt-2"
              placeholder="Enter reactivation reason..."
              value={reactivateReason}
              onChange={(e) => setReactivateReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setReactivateEmp(null); setReactivateReason(""); }}
              disabled={reactivating}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              disabled={!reactivateReason.trim() || reactivating}
              onClick={handleReactivateConfirm}
            >
              {reactivating ? <Loader2Icon className="size-4 animate-spin mr-1" /> : <Undo2 className="size-4 mr-1" />}
              Reactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
