"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffAddPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Add Staff</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a new staff member account</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Staff Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Staff creation form will be implemented here. Use the Employees section to add new employees.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
