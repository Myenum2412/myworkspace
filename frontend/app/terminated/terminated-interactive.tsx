"use client";

import { useState, useEffect } from "react";
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
import { UserX, Undo2, Loader2Icon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { TerminatedEmployee } from "../employees/columns";

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export default function TerminatedInteractive() {
  const [terminated, setTerminated] = useState<TerminatedEmployee[]>([]);
  const [reactivateEmp, setReactivateEmp] = useState<TerminatedEmployee | null>(null);
  const [reactivateReason, setReactivateReason] = useState("");
  const [reactivating, setReactivating] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const totalPages = Math.ceil(terminated.length / rowsPerPage);
  const paginatedTerminated = terminated.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("terminated_employees") || "[]") as TerminatedEmployee[];
      if (stored.length > 0) {
        setTerminated(stored);
      }
    } catch (err) {
      console.error("[TERMINATED] Failed to parse localStorage:", err);
    } finally {
      setPageLoading(false);
    }
  }, []);

  function handleReactivateClick(emp: TerminatedEmployee) {
    setReactivateEmp(emp);
    setReactivateReason("");
    setReactivating(false);
  }

  function handleReactivateConfirm() {
    if (!reactivateEmp) return;
    setReactivating(true);

    const { terminateReason: _terminateReason, terminateDate: _terminateDate, ...employeeData } = reactivateEmp;
    const reactivated = {
      ...employeeData,
      status: "active" as const,
    };

    const employees = JSON.parse(localStorage.getItem("employees") || "[]");
    localStorage.setItem("employees", JSON.stringify([...employees, reactivated]));

    setTerminated((prev) => prev.filter((e) => e.id !== reactivateEmp.id));
    const stored = JSON.parse(localStorage.getItem("terminated_employees") || "[]") as TerminatedEmployee[];
    localStorage.setItem("terminated_employees", JSON.stringify(stored.filter((e) => e.id !== reactivateEmp.id)));

    setReactivateEmp(null);
    setReactivateReason("");
    setReactivating(false);
  }

  if (pageLoading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
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
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-sm" style={{ minWidth: 900 }}>
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
                <tbody className="divide-y divide-gray-100">
                  {paginatedTerminated.map((emp) => (
                    <tr key={emp.id} className="group bg-white hover:bg-slate-50 transition-colors">
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
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleReactivateClick(emp)}
                        >
                          <Undo2 className="size-3 mr-1" />
                          Reactivate
                        </Button>
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
