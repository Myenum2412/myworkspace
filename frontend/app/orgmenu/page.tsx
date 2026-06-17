import { cache } from "react";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersIcon, ClipboardListIcon, ActivityIcon, Building2Icon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Organization Dashboard",
};

const getOrgMetrics = cache(async (orgId: string) => {
  const memberCount = db
    .select({ count: count() })
    .from(schema.orgMembers)
    .where(eq(schema.orgMembers.orgId, orgId))
    .all();

  const taskCount = db
    .select({ count: count() })
    .from(schema.tasks)
    .where(eq(schema.tasks.orgId, orgId))
    .all();

  const activityCount = db
    .select({ count: count() })
    .from(schema.activityLogs)
    .where(eq(schema.activityLogs.orgId, orgId))
    .all();

  return {
    members: memberCount[0]?.count ?? 0,
    tasks: taskCount[0]?.count ?? 0,
    activities: activityCount[0]?.count ?? 0,
  };
});

export default async function OrgDashboardPage() {
  const metrics = await getOrgMetrics("demo-org-id");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.members}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            <ClipboardListIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.tasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activities</CardTitle>
            <ActivityIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activities}</div>
          </CardContent>
        </Card>
      </div>
      <div className="min-h-[200px] flex-1 rounded-xl bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <Building2Icon className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Organization overview and quick stats</p>
        </div>
      </div>
    </div>
  );
}
