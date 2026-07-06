import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldIcon, UsersIcon, UserIcon } from "lucide-react";

export const metadata = { title: "Roles" };

const roles = [
  { name: "Admin", description: "Full access to all settings and members.", permissions: ["Manage org", "Manage members", "View reports", "Configure security", "Manage billing"], icon: ShieldIcon, color: "text-red-500" },
  { name: "Manager", description: "Manage members and view reports.", permissions: ["View members", "Invite members", "View reports", "Manage tasks"], icon: UsersIcon, color: "text-red-400" },
  { name: "Member", description: "Basic access to assigned resources.", permissions: ["View tasks", "Update own tasks", "View team", "Receive notifications"], icon: UserIcon, color: "text-red-500" },
];

export default function RolesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Roles</h1>
      </div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.name}>
            <CardHeader>
              <role.icon className={`size-8 ${role.color}`} />
              <CardTitle className="mt-2">{role.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {role.permissions.map((perm) => (
                  <li key={perm} className="text-sm flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    {perm}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
