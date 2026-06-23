"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
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
import { UserX, Undo2, Loader2Icon } from "lucide-react";
import type { TerminatedEmployee } from "../employees/columns";

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export default function TerminatedPage() {
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });
  const [terminated, setTerminated] = useState<TerminatedEmployee[]>([]);
  const [reactivateEmp, setReactivateEmp] = useState<TerminatedEmployee | null>(null);
  const [reactivateReason, setReactivateReason] = useState("");
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("terminated_employees") || "[]") as TerminatedEmployee[];
      if (stored.length > 0) {
        setTerminated(stored);
      }
    } catch {}
  }, []);

  function handleReactivateClick(emp: TerminatedEmployee) {
    setReactivateEmp(emp);
    setReactivateReason("");
    setReactivating(false);
  }

  function handleReactivateConfirm() {
    if (!reactivateEmp) return;
    setReactivating(true);

    const { terminateReason, terminateDate, ...employeeData } = reactivateEmp;
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

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-2xl font-bold">Terminated</h1>
            <p className="text-sm text-muted-foreground mt-1">{terminated.length} former employees</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="size-4 text-muted-foreground" />
                Terminated Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              {terminated.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No terminated employees.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Employee</th>
                        <th className="pb-3 font-medium">Department</th>
                        <th className="pb-3 font-medium">Role</th>
                        <th className="pb-3 font-medium">End Date</th>
                        <th className="pb-3 font-medium">Reason</th>
                        <th className="pb-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {terminated.map((emp) => (
                        <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="size-8 opacity-60">
                                <AvatarImage src={emp.avatar} alt={emp.name} />
                                <AvatarFallback>{getInitials(emp.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{emp.name}</p>
                                <p className="text-xs text-muted-foreground">{emp.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-sm">{emp.department || "—"}</td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground">{emp.designation || emp.role || "—"}</td>
                          <td className="py-3 pr-4 text-sm">
                            {emp.terminateDate
                              ? new Date(emp.terminateDate).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="py-3">
                            <Badge variant="outline">{emp.terminateReason}</Badge>
                          </td>
                          <td className="py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleReactivateClick(emp)}
                            >
                              <Undo2 className="size-3 mr-1" />
                              Reactive
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>

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
    </SidebarProvider>
  );
}
