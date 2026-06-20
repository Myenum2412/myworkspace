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
import { UserX } from "lucide-react";
import type { TerminatedEmployee } from "../employees/columns";

const staticTerminated: TerminatedEmployee[] = [
  { id: "term_1", name: "Michael Scott", email: "m.scott@company.com", role: "Regional Manager", status: "terminated", department: "Sales", designation: "Manager", employmentType: "Full-time", phone: "", branchName: "", joiningDate: "", avatar: "", terminateReason: "Resignation", terminateDate: "2025-11-15T00:00:00Z" },
  { id: "term_2", name: "Pam Beesly", email: "p.beesly@company.com", role: "Receptionist", status: "terminated", department: "Operations", designation: "", employmentType: "Full-time", phone: "", branchName: "", joiningDate: "", avatar: "", terminateReason: "Resignation", terminateDate: "2025-09-30T00:00:00Z" },
  { id: "term_3", name: "Ryan Howard", email: "r.howard@company.com", role: "Marketing Specialist", status: "terminated", department: "Marketing", designation: "", employmentType: "Contract", phone: "", branchName: "", joiningDate: "", avatar: "", terminateReason: "Contract Ended", terminateDate: "2025-06-20T00:00:00Z" },
  { id: "term_4", name: "Kelly Kapoor", email: "k.kapoor@company.com", role: "Customer Relations", status: "terminated", department: "Customer Success", designation: "", employmentType: "Full-time", phone: "", branchName: "", joiningDate: "", avatar: "", terminateReason: "Resignation", terminateDate: "2025-04-10T00:00:00Z" },
  { id: "term_5", name: "Toby Flenderson", email: "t.flenderson@company.com", role: "HR Manager", status: "terminated", department: "HR", designation: "", employmentType: "Full-time", phone: "", branchName: "", joiningDate: "", avatar: "", terminateReason: "Retirement", terminateDate: "2025-02-28T00:00:00Z" },
  { id: "term_6", name: "Angela Martin", email: "a.martin@company.com", role: "Accountant", status: "terminated", department: "Finance", designation: "", employmentType: "Full-time", phone: "", branchName: "", joiningDate: "", avatar: "", terminateReason: "Resignation", terminateDate: "2025-01-15T00:00:00Z" },
];

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export default function TerminatedPage() {
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });
  const [terminated, setTerminated] = useState<TerminatedEmployee[]>(staticTerminated);

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
        const existingIds = new Set(staticTerminated.map((e) => e.id));
        const newOnes = stored.filter((e) => !existingIds.has(e.id));
        setTerminated([...staticTerminated, ...newOnes]);
      }
    } catch {}
  }, []);

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
    </SidebarProvider>
  );
}
