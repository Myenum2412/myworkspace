"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const roles = [
  { name: "Admin", members: 3, permissions: "Full access to all features" },
  { name: "Manager", members: 5, permissions: "Manage team, tasks, and reports" },
  { name: "Member", members: 12, permissions: "View and update assigned tasks" },
  { name: "Viewer", members: 2, permissions: "Read-only access" },
];

export default function StaffRolesPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Staff Roles</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage role permissions</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Roles & Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-sm">
            <div className="overflow-x-auto">
              <table className="table-premium w-full text-sm text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Role</th>
                    <th className="px-4 py-3.5 font-semibold">Members</th>
                    <th className="px-4 py-3.5 font-semibold">Permissions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{r.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{r.members}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.permissions}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
