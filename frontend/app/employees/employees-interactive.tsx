"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon, UsersIcon, PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataTable } from "./data-table";
import { getColumns, type Employee } from "./columns";
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

export default function EmployeesInteractive({ employees: initialEmployees, user }: EmployeesInteractiveProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [terminatingEmployee, setTerminatingEmployee] = useState<Employee | null>(null);
  const [terminateReason, setTerminateReason] = useState("");

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q) ||
        e.phone?.includes(q) ||
        e.displayId?.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const handleEdit = useCallback((emp: Employee) => {
    setEditingEmployee(emp);
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

  const columns = useMemo(() => getColumns(handleEdit, handleTerminate), [handleEdit, handleTerminate]);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-6" />
            <h1 className="text-2xl font-bold">Employees</h1>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <PlusIcon className="mr-2 size-4" />
            Add Employee
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {employees.filter((e) => e.status === "active" || e.status === "online").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">On Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {employees.filter((e) => e.status === "on_leave").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Inactive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">
                {employees.filter((e) => e.status === "inactive" || e.status === "offline").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Employee List</CardTitle>
              <div className="relative w-64">
                <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={filteredEmployees}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onRowClick={setViewingEmployee}
            />
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!viewingEmployee} onOpenChange={(o) => { if (!o) setViewingEmployee(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>View employee information and documents</DialogDescription>
          </DialogHeader>
          {viewingEmployee && <EmployeeDetailedView employee={viewingEmployee} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEmployee} onOpenChange={(o) => { if (!o) setEditingEmployee(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information</DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <EmployeeEditForm
              employee={editingEmployee}
              onSave={() => setEditingEmployee(null)}
              onCancel={() => setEditingEmployee(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>Fill in the details to add a new employee</DialogDescription>
          </DialogHeader>
          <AddEmployeeForm
            onCancel={() => setShowAddForm(false)}
            onEmployeeAdded={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!terminatingEmployee} onOpenChange={(o) => { if (!o) setTerminatingEmployee(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Terminate Employee</DialogTitle>
            <DialogDescription>
              {terminatingEmployee ? (
                <>Are you sure you want to terminate <strong>{terminatingEmployee.name}</strong>?</>
              ) : "Are you sure you want to terminate this employee?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for termination</label>
              <textarea
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] mt-1"
                placeholder="Enter reason..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setTerminatingEmployee(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleTerminateConfirm} disabled={!terminateReason.trim()}>
              Terminate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
