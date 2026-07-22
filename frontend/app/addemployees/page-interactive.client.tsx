"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AddEmployeeForm } from "../employees/add-employee-form";

export function AddEmployeePageInteractive() {
  const router = useRouter();

  const handleClose = () => {
    router.refresh();
    router.push("/employees");
  };

  return (
    <div className="flex flex-col h-full bg-card border rounded-sm overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Add New Employee</h2>
      </div>
      <AddEmployeeForm onCancel={handleClose} onEmployeeAdded={handleClose} />
    </div>
  );
}
