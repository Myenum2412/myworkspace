import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldIcon, KeyIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Security" };

const getSecurityData = cache(async (orgId: string) => {
  const [activeSessions, totalMembers, adminCount, apiKeyCount] = await Promise.all([
    db.collection(collections.users).countDocuments({ status: "online" }),
    db.collection(collections.orgMembers).countDocuments({ orgId }),
    db.collection(collections.orgMembers).countDocuments({ orgId, role: "members" }),
    db.collection(collections.apiKeys).countDocuments({ orgId }),
  ]);
  return { activeSessions, totalMembers, adminCount, apiKeyCount };
});

const getAllSecurityData = cache(async () => {
  const [activeSessions, totalMembers, adminCount, apiKeyCount] = await Promise.all([
    db.collection(collections.users).countDocuments({ status: "online" }),
    db.collection(collections.orgMembers).countDocuments({}),
    db.collection(collections.orgMembers).countDocuments({ role: "members" }),
    db.collection(collections.apiKeys).countDocuments({}),
  ]);
  return { activeSessions, totalMembers, adminCount, apiKeyCount };
});

export default async function SecurityPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "org_admin";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const data = isSuperAdmin ? await getAllSecurityData() : await getSecurityData(orgId || "null");

  const items = [
    { label: "Active Sessions", value: String(data.activeSessions), color: "text-primary", icon: ShieldIcon },
    { label: "Total Members", value: String(data.totalMembers), color: "text-primary", icon: UsersIcon },
    { label: "Admins", value: String(data.adminCount), color: "text-primary", icon: ShieldCheckIcon },
    { label: "API Keys", value: String(data.apiKeyCount), color: "text-primary", icon: KeyIcon },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin ? "Security overview across all organizations" : "Your organization security status"}
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="size-5" />
            Security Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {items.map((item) => (
              <div key={item.label} className="rounded-sm border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className={`size-4 ${item.color}`} />
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
