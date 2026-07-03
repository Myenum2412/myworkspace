"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "lucide-react";
import type { Employee } from "@/app/employees/columns";
import { EmployeeEditForm } from "@/app/employees/employee-edit-form";

type EmployeeDetailsProps = {
  employee: Employee;
  isViewMode: boolean;
  onBack: () => void;
  onSwitchToEdit: () => void;
  onSave: (employee: Employee) => void;
  onCancel: () => void;
};

export function EmployeeDetails({ employee, isViewMode, onBack, onSwitchToEdit, onSave, onCancel }: EmployeeDetailsProps) {
  return (
    <main className="flex flex-1 flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-white sticky top-0 z-10 shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ChevronLeftIcon className="size-4" />
          Back
        </Button>
        <div className="h-5 w-px bg-border" />
        <h1 className="text-lg font-semibold text-black">{isViewMode ? "Employee Details" : "Edit Employee"}</h1>
      </div>
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-5xl mx-auto py-6 bg-white my-6">
          <EmployeeEditForm
            key={employee.id}
            employee={employee}
            isViewMode={isViewMode}
            onSwitchToEdit={onSwitchToEdit}
            onSave={(updated) => {
              onSave(updated);
            }}
            onCancel={onCancel}
          />
        </div>
      </div>
    </main>
  );
}
