import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ShieldIcon,
  UsersIcon,
  UserIcon,
  BuildingIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
  LockIcon,
  EyeIcon,
  SettingsIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Roles & Permissions" };

const iconMap: Record<string, typeof ShieldIcon> = {
  org_admin: ShieldIcon,
  members: BuildingIcon,
  staffs: UsersIcon,
  hr: UsersIcon,
  clients: ExternalLinkIcon,
};

const colorMap: Record<string, string> = {
  org_admin: "text-red-500 bg-red-500/10",
  members: "text-red-400 bg-red-400/10",
  staffs: "text-blue-500 bg-blue-500/10",
  hr: "text-green-500 bg-green-500/10",
  clients: "text-purple-500 bg-purple-500/10",
};

const accessLevelMap: Record<string, { level: string; color: string; icon: typeof ShieldIcon }> = {
  org_admin: { level: "Full Access", color: "bg-red-500", icon: SettingsIcon },
  members: { level: "Admin Access", color: "bg-orange-500", icon: ShieldIcon },
  staffs: { level: "Limited Access", color: "bg-blue-500", icon: LockIcon },
  hr: { level: "Department Access", color: "bg-green-500", icon: UsersIcon },
  clients: { level: "Portal Access", color: "bg-purple-500", icon: EyeIcon },
};

const getRolesWithMembers = cache(async (orgId: string) => {
  const members = await db.collection(collections.orgMembers).find({ orgId }).toArray();
  const roleData: Record<string, { count: number; members: Array<{ name: string; email: string; avatar?: string }> }> = {};

  for (const m of members) {
    const role = (m.role as string) || "staffs";
    if (!roleData[role]) {
      roleData[role] = { count: 0, members: [] };
    }
    roleData[role].count++;
    roleData[role].members.push({
      name: (m.name as string) || "Unknown",
      email: (m.email as string) || "",
      avatar: m.avatar as string | undefined,
    });
  }

  return roleData;
});

const getAllRolesWithMembers = cache(async () => {
  const members = await db.collection(collections.orgMembers).find({}).toArray();
  const roleData: Record<string, { count: number; members: Array<{ name: string; email: string; avatar?: string }> }> = {};

  for (const m of members) {
    const role = (m.role as string) || "staffs";
    if (!roleData[role]) {
      roleData[role] = { count: 0, members: [] };
    }
    roleData[role].count++;
    roleData[role].members.push({
      name: (m.name as string) || "Unknown",
      email: (m.email as string) || "",
      avatar: m.avatar as string | undefined,
    });
  }

  return roleData;
});

const roleDefinitions: Record<
  string,
  {
    description: string;
    permissions: string[];
    capabilities: string[];
    restrictions: string[];
  }
> = {
  org_admin: {
    description:
      "Unrestricted access to every organization, workspace, company, user, subscription, billing, settings, audit logs, analytics, and system configuration.",
    permissions: [
      "Full platform access",
      "Manage all companies",
      "Manage all users",
      "System configuration",
      "Audit logs",
    ],
    capabilities: [
      "Create/delete organizations",
      "Manage all subscriptions",
      "Access billing & payments",
      "View system analytics",
      "Manage API keys",
      "Configure integrations",
    ],
    restrictions: [],
  },
  members: {
    description:
      "Full administrative rights only inside their own organization. Can manage projects, workspaces, staff, clients, billing, and company settings.",
    permissions: ["Manage org", "Manage members", "Manage projects", "View reports", "Manage billing"],
    capabilities: [
      "Invite/remove members",
      "Create workspaces",
      "Manage project settings",
      "View team analytics",
      "Handle invoices",
    ],
    restrictions: ["Cannot access other organizations", "Cannot modify system settings"],
  },
  staffs: {
    description:
      "Can access only the resources assigned by their company owner. Can manage tasks, upload files, communicate, submit approvals, and collaborate.",
    permissions: ["View tasks", "Update own tasks", "Upload files", "Collaborate", "Receive notifications"],
    capabilities: [
      "Complete assigned tasks",
      "Upload/download files",
      "Send team messages",
      "Submit for approval",
      "Track time & progress",
    ],
    restrictions: ["Cannot invite members", "Cannot delete projects", "Limited file storage"],
  },
  hr: {
    description:
      "Can manage employees, attendance, leave, payroll, recruitment, onboarding, documents, performance, and HR-related reports within their organization.",
    permissions: ["Manage employees", "Manage attendance", "Manage leave", "Manage payroll", "HR reports"],
    capabilities: [
      "Onboard new employees",
      "Track attendance",
      "Process leave requests",
      "Generate HR reports",
      "Manage performance reviews",
    ],
    restrictions: ["Cannot access financial data", "Limited to HR modules only"],
  },
  clients: {
    description:
      "Can only access the client portal. Can view assigned projects, approved files, invoices, messages, and shared documents.",
    permissions: ["Client portal", "View projects", "View files", "View invoices", "Send messages"],
    capabilities: [
      "View project progress",
      "Download shared files",
      "View invoices & payments",
      "Send messages to team",
      "Approve deliverables",
    ],
    restrictions: ["Read-only access", "Cannot edit content", "No team management"],
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function RolesPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "org_admin";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const roleData = isSuperAdmin ? await getAllRolesWithMembers() : await getRolesWithMembers(orgId || "null");

  const totalMembers = Object.values(roleData).reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldIcon className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
              <p className="text-muted-foreground">
                Manage role definitions, permissions, and member assignments across the platform.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(roleDefinitions).map(([roleKey, def]) => {
            const IconComponent = iconMap[roleKey] || UsersIcon;
            const colorClass = colorMap[roleKey] || "text-muted-foreground";
            const count = roleData[roleKey]?.count || 0;
            const percentage = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;

            return (
              <Card key={roleKey} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <IconComponent className="size-4" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {percentage}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground capitalize">{roleKey.replace(/_/g, " ")}</p>
                  </div>
                  <Progress value={percentage} className="h-1 mt-3" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Role Details Cards */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Role Details</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {Object.entries(roleDefinitions).map(([roleKey, def]) => {
              const IconComponent = iconMap[roleKey] || UsersIcon;
              const colorClass = colorMap[roleKey] || "text-muted-foreground";
              const accessInfo = accessLevelMap[roleKey];
              const roleMembers = roleData[roleKey]?.members || [];
              const count = roleData[roleKey]?.count || 0;
              const AccessIcon = accessInfo.icon;

              return (
                <Card key={roleKey} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className={`pb-4 ${colorClass.split(" ")[1]}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <IconComponent className="size-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg capitalize">{roleKey.replace(/_/g, " ")}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <AccessIcon className="size-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{accessInfo.level}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {count} members
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed">{def.description}</p>

                    <Separator />

                    {/* Permissions */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <CheckCircleIcon className="size-4 text-green-500" />
                        Permissions
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {def.permissions.map((perm) => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Capabilities */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Can Do</h4>
                      <ul className="space-y-1">
                        {def.capabilities.map((cap) => (
                          <li key={cap} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircleIcon className="size-3 text-green-500 shrink-0" />
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Restrictions */}
                    {def.restrictions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-destructive">Cannot Do</h4>
                        <ul className="space-y-1">
                          {def.restrictions.map((restriction) => (
                            <li key={restriction} className="flex items-center gap-2 text-sm text-destructive/80">
                              <LockIcon className="size-3 shrink-0" />
                              {restriction}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Separator />

                    {/* Members List */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3">
                        Assigned Members ({roleMembers.length})
                      </h4>
                      {roleMembers.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {roleMembers.slice(0, 10).map((member, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <Avatar className="size-8">
                                <AvatarImage src={member.avatar} alt={member.name} />
                                <AvatarFallback className="text-xs">{getInitials(member.name)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{member.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                              </div>
                            </div>
                          ))}
                          {roleMembers.length > 10 && (
                            <p className="text-xs text-muted-foreground text-center py-1">
                              +{roleMembers.length - 10} more members
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                          No members assigned to this role yet.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
