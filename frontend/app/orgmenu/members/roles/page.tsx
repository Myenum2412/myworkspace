import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldIcon, UsersIcon, UserIcon, BuildingIcon, ExternalLinkIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Roles" };

const iconMap: Record<string, typeof ShieldIcon> = {
  org_admin: ShieldIcon,
  members: BuildingIcon,
  staffs: UsersIcon,
  hr: UsersIcon,
  clients: ExternalLinkIcon,
};

const colorMap: Record<string, string> = {
  org_admin: "text-red-500",
  members: "text-red-400",
  staffs: "text-blue-500",
  hr: "text-green-500",
  clients: "text-purple-500",
};

const getRolesFromDB = cache(async (orgId: string) => {
  const members = await db.collection(collections.orgMembers).find({ orgId }).toArray();
  const roleCounts: Record<string, number> = {};
  for (const m of members) {
    const role = (m.role as string) || "staffs";
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  return roleCounts;
});

const getAllRolesFromDB = cache(async () => {
  const members = await db.collection(collections.orgMembers).find({}).toArray();
  const roleCounts: Record<string, number> = {};
  for (const m of members) {
    const role = (m.role as string) || "staffs";
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  return roleCounts;
});

const roleDefinitions: Record<string, { description: string; permissions: string[] }> = {
  org_admin: {
    description: "Unrestricted access to every organization, workspace, company, user, subscription, billing, settings, audit logs, analytics, and system configuration.",
    permissions: ["Full platform access", "Manage all companies", "Manage all users", "System configuration", "Audit logs"],
  },
  members: {
    description: "Full administrative rights only inside their own organization. Can manage projects, workspaces, staff, clients, billing, and company settings.",
    permissions: ["Manage org", "Manage members", "Manage projects", "View reports", "Manage billing"],
  },
  staffs: {
    description: "Can access only the resources assigned by their company owner. Can manage tasks, upload files, communicate, submit approvals, and collaborate.",
    permissions: ["View tasks", "Update own tasks", "Upload files", "Collaborate", "Receive notifications"],
  },
  hr: {
    description: "Can manage employees, attendance, leave, payroll, recruitment, onboarding, documents, performance, and HR-related reports within their organization.",
    permissions: ["Manage employees", "Manage attendance", "Manage leave", "Manage payroll", "HR reports"],
  },
  clients: {
    description: "Can only access the client portal. Can view assigned projects, approved files, invoices, messages, and shared documents.",
    permissions: ["Client portal", "View projects", "View files", "View invoices", "Send messages"],
  },
};

export default async function RolesPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "org_admin";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const roleCounts = isSuperAdmin ? await getAllRolesFromDB() : await getRolesFromDB(orgId || "null");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-sm text-muted-foreground">Manage role definitions across the platform.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Object.entries(roleDefinitions).map(([roleKey, def]) => {
          const IconComponent = iconMap[roleKey] || UsersIcon;
          const colorClass = colorMap[roleKey] || "text-muted-foreground";
          const count = roleCounts[roleKey] || 0;

          return (
            <Card key={roleKey} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <IconComponent className={`size-5 ${colorClass}`} />
                  <CardTitle className="text-base capitalize">{roleKey.replace(/_/g, ' ')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{def.description}</p>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Members: <span className="font-bold">{count}</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {def.permissions.map((perm) => (
                      <span key={perm} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
