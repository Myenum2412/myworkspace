import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldIcon, UsersIcon, UserIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Roles" };

const iconMap: Record<string, typeof ShieldIcon> = {
  admin: ShieldIcon,
  manager: UsersIcon,
  member: UserIcon,
};

const colorMap: Record<string, string> = {
  admin: "text-red-500",
  manager: "text-red-400",
  member: "text-red-500",
};

const getRolesFromDB = cache(async (orgId: string) => {
  const members = await db.collection(collections.orgMembers).find({ orgId }).toArray();
  const roleCounts: Record<string, number> = {};
  for (const m of members) {
    const role = (m.role as string) || "member";
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  return roleCounts;
});

const getAllRolesFromDB = cache(async () => {
  const members = await db.collection(collections.orgMembers).find({}).toArray();
  const roleCounts: Record<string, number> = {};
  for (const m of members) {
    const role = (m.role as string) || "member";
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  return roleCounts;
});

const roleDefinitions: Record<string, { description: string; permissions: string[] }> = {
  admin: {
    description: "Full access to all settings and members.",
    permissions: ["Manage org", "Manage members", "View reports", "Configure security", "Manage billing"],
  },
  manager: {
    description: "Manage members and view reports.",
    permissions: ["View members", "Invite members", "View reports", "Manage tasks"],
  },
  member: {
    description: "Basic access to assigned resources.",
    permissions: ["View tasks", "Update own tasks", "View team", "Receive notifications"],
  },
};

export default async function RolesPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const roleCounts = isSuperAdmin ? await getAllRolesFromDB() : await getRolesFromDB(orgId || "null");

  const roles = Object.entries(roleCounts).map(([name, count]) => {
    const def = roleDefinitions[name] || { description: "Custom role.", permissions: [] };
    const Icon = iconMap[name] || UserIcon;
    const color = colorMap[name] || "text-primary";
    return { name: name.charAt(0).toUpperCase() + name.slice(1), count, description: def.description, permissions: def.permissions, icon: Icon, color };
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Roles</h1>
      </div>
      {roles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No roles found.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.name}>
              <CardHeader>
                <r.icon className={`size-8 ${r.color}`} />
                <CardTitle className="mt-2">{r.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{r.description}</p>
                <p className="text-xs text-muted-foreground">{r.count} member{r.count !== 1 ? "s" : ""}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {r.permissions.map((perm) => (
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
      )}
    </div>
  );
}
