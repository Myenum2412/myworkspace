import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Staff Roles",
};

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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Members</th>
                  <th className="pb-3 font-medium">Permissions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="text-sm font-medium">{r.name}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">{r.members}</Badge>
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">{r.permissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
