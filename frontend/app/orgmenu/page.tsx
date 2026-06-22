import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersIcon, ClipboardListIcon, ActivityIcon, Building2Icon, CheckCircle2Icon, ClockIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organization Dashboard" };

const getOrgMetrics = cache(async (orgId: string) => {
  const memberCount = await db.collection(collections.orgMembers).countDocuments({ orgId });
  const taskCount = await db.collection(collections.tasks).countDocuments({ orgId });
  const completedTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "done" });
  const inProgressTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "in_progress" });
  const activityCount = await db.collection(collections.activityLogs).countDocuments({ orgId });
  return { memberCount, taskCount, completedTasks, inProgressTasks, activityCount };
});

const getAllMetrics = cache(async () => {
  const orgCount = await db.collection(collections.organizations).countDocuments({});
  const memberCount = await db.collection(collections.orgMembers).countDocuments({});
  const taskCount = await db.collection(collections.tasks).countDocuments({});
  const completedTasks = await db.collection(collections.tasks).countDocuments({ status: "done" });
  const inProgressTasks = await db.collection(collections.tasks).countDocuments({ status: "in_progress" });
  const activityCount = await db.collection(collections.activityLogs).countDocuments({});
  return { orgCount, memberCount, taskCount, completedTasks, inProgressTasks, activityCount };
});

const getRecentOrgs = cache(async () => {
  const orgs = await db.collection(collections.organizations)
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .project({ id: 1, name: 1, plan: 1, createdAt: 1 })
    .toArray();
  return orgs;
});

export default async function OrgDashboardPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";

  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let metrics: Awaited<ReturnType<typeof getOrgMetrics>>;
  let recentOrgs: Awaited<ReturnType<typeof getRecentOrgs>> = [];

  if (isSuperAdmin) {
    metrics = await getAllMetrics();
    recentOrgs = await getRecentOrgs();
  } else {
    metrics = await getOrgMetrics(orgId || "null");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isSuperAdmin ? "Super Admin Dashboard" : "Organization Dashboard"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin ? "Overview of all organizations" : "Your organization at a glance"}
          </p>
        </div>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-3 lg:grid-cols-6">
        {isSuperAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Organizations</CardTitle>
              <Building2Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics as unknown as { orgCount?: number }).orgCount ?? 0}</div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.memberCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            <ClipboardListIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.taskCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle2Icon className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <ClockIcon className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.inProgressTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activities</CardTitle>
            <ActivityIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activityCount}</div>
          </CardContent>
        </Card>
      </div>

      {isSuperAdmin && recentOrgs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2Icon className="size-5" />
              Recent Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {recentOrgs.map((org) => (
                <div key={org.id as string} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{org.name as string}</p>
                    <p className="text-xs text-muted-foreground">Plan: {(org.plan as string) || "starter"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {org.createdAt ? new Date(org.createdAt as string).toLocaleDateString() : "—"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="min-h-[200px] flex-1 rounded-xl bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <Building2Icon className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin ? "Organization overview across all tenants" : "Organization overview and quick stats"}
          </p>
        </div>
      </div>
    </div>
  );
}
