import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersIcon, ClipboardListIcon, ActivityIcon, Building2Icon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Organization Dashboard",
};

const getOrgMetrics = cache(async (orgId: string) => {
  const memberCount = await db
    .collection(collections.orgMembers)
    .countDocuments({ orgId });

  const taskCount = await db
    .collection(collections.tasks)
    .countDocuments({ orgId });

  const activityCount = await db
    .collection(collections.activityLogs)
    .countDocuments({ orgId });

  return {
    members: memberCount,
    tasks: taskCount,
    activities: activityCount,
  };
});

export default async function OrgDashboardPage() {
  const session = await auth();
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;
  const metrics = await getOrgMetrics(orgId || "null");

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
