"use client";

import { useState } from "react";
import { UsersIcon, UserPlusIcon, UserMinusIcon, BuildingIcon, XIcon, SearchIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getColumns, type Employee, type TerminatedEmployee } from "./columns";
import { DataTable } from "./data-table";
import { EmployeeDetailedView } from "./employee-detailed-view";
import { AddEmployeeForm } from "./add-employee-form";

type Props = {
  employees: Employee[];
  user: { name: string; email: string; avatar: string };
};

const statusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  online: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  offline: "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  break: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  on_leave: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export default function EmployeesPageClient({ employees: initialEmployees, user }: Props) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateEmp, setTerminateEmp] = useState<Employee | null>(null);
  const [terminateReason, setTerminateReason] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewEmp, setViewEmp] = useState<Employee | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const active = employees.filter((e) => e.status === "online" || e.status === "active").length;
  const onLeave = employees.filter((e) => e.status === "break" || e.status === "on_leave").length;
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))].length;

  const handleView = (emp: Employee) => {
    setViewEmp(emp);
    setViewOpen(true);
  };

  const handleTerminate = (emp: Employee) => {
    setTerminateEmp(emp);
    setTerminateReason("");
    setTerminateOpen(true);
  };

  const handleTerminateConfirm = () => {
    if (!terminateEmp || !terminateReason.trim()) return;
    const terminated: TerminatedEmployee = {
      ...terminateEmp,
      terminateReason: terminateReason.trim(),
      terminateDate: new Date().toISOString(),
    };
    const stored = JSON.parse(localStorage.getItem("terminated_employees") || "[]");
    localStorage.setItem("terminated_employees", JSON.stringify([...stored, terminated]));
    setEmployees((prev) => prev.filter((e) => e.id !== terminateEmp.id));
    setTerminateOpen(false);
    setTerminateEmp(null);
    setTerminateReason("");
  };

  const handleEmployeeAdded = (employee: Record<string, unknown>) => {
    const newEmp: Employee = {
      id: (employee.id as string) || `emp_${Date.now()}`,
      name: (employee.name as string) || `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Unknown",
      email: employee.email as string,
      phone: (employee.phone as string) || "",
      department: (employee.department as string) || "",
      designation: (employee.role as string) || (employee.roleName as string) || "",
      employmentType: (employee.employmentType as string) || "",
      branchName: (employee.branchName as string) || "",
      joiningDate: (employee.joiningDate as string) || "",
      role: "member",
      status: (employee.status as string) || "active",
      avatar: (employee.avatar as string) || "",
    };
    setEmployees((prev) => [newEmp, ...prev]);
    setAddOpen(false);
  };

  const columns = getColumns(undefined, handleTerminate);

  return (
    <>
      <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Employees</h1>
                  <p className="text-sm text-muted-foreground">Manage your organization&apos;s workforce</p>
                </div>
              </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <UsersIcon className="size-4" /> Total Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <UserPlusIcon className="size-4" /> Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <UserMinusIcon className="size-4" /> On Leave
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">{onLeave}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <BuildingIcon className="size-4" /> Departments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{departments || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="text-base shrink-0">Employee Directory</CardTitle>
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={employees} searchQuery={searchQuery} onSearchChange={setSearchQuery} onRowClick={handleView} />
            </CardContent>
          </Card>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={(o) => { if (!o) { setViewOpen(false); setViewEmp(null); } }}>
        <DialogContent className="p-0 flex flex-col">
          {viewEmp && <EmployeeDetailedView employee={viewEmp} />}
        </DialogContent>
      </Dialog>



      {/* Terminate Dialog */}
      <Dialog open={terminateOpen} onOpenChange={(o) => { if (!o) { setTerminateOpen(false); setTerminateEmp(null); setTerminateReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Terminate Employee</DialogTitle>
            <DialogDescription>
              This will move {terminateEmp?.name} to the terminated list.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-muted-foreground">Reason for termination</Label>
            <Textarea
              className="mt-2"
              placeholder="Enter termination reason..."
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTerminateOpen(false); setTerminateEmp(null); setTerminateReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleTerminateConfirm} disabled={!terminateReason.trim()}>
              <UserMinusIcon className="mr-2 size-4" />
              Confirm Termination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


  );
}
