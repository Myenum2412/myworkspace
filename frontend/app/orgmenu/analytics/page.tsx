import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUpIcon, UsersIcon, CheckCircle2Icon, BarChart2Icon, ClockIcon, XCircleIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };

const getAnalytics = cache(async (orgId: string) => {
  try {
    const totalTasks = await db.collection(collections.tasks).countDocuments({ orgId });
    const completedTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "done" });
    const inProgressTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "in_progress" });
    const cancelledTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "cancelled" });
    const activeMembers = await db.collection(collections.orgMembers).countDocuments({ orgId });
    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { totalTasks, completedTasks, inProgressTasks, cancelledTasks, activeMembers, completionRate };
  } catch {
    return { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, cancelledTasks: 0, activeMembers: 0, completionRate: 0 };
  }
});

const getAllAnalytics = cache(async () => {
  try {
    const totalTasks = await db.collection(collections.tasks).countDocuments({});
    const completedTasks = await db.collection(collections.tasks).countDocuments({ status: "done" });
    const inProgressTasks = await db.collection(collections.tasks).countDocuments({ status: "in_progress" });
    const cancelledTasks = await db.collection(collections.tasks).countDocuments({ status: "cancelled" });
    const activeMembers = await db.collection(collections.orgMembers).countDocuments({});
    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { totalTasks, completedTasks, inProgressTasks, cancelledTasks, activeMembers, completionRate };
  } catch {
    return { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, cancelledTasks: 0, activeMembers: 0, completionRate: 0 };
  }
});

export default async function AnalyticsPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const analytics = isSuperAdmin ? await getAllAnalytics() : await getAnalytics(orgId || "null");

  const items = [
    { title: "Total Tasks", value: analytics.totalTasks, icon: BarChart2Icon, color: "text-primary" },
    { title: "Completed", value: analytics.completedTasks, icon: CheckCircle2Icon, color: "text-primary" },
    { title: "In Progress", value: analytics.inProgressTasks, icon: ClockIcon, color: "text-primary" },
    { title: "Cancelled", value: analytics.cancelledTasks, icon: XCircleIcon, color: "text-primary" },
    { title: "Completion Rate", value: `${analytics.completionRate}%`, icon: TrendingUpIcon, color: "text-primary" },
    { title: "Active Members", value: analytics.activeMembers, icon: UsersIcon, color: "text-primary" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin ? "Aggregated analytics across all organizations" : "Your organization performance"}
          </p>
        </div>
      </div>
      <div className="grid auto-rows-min gap-4 md:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
              <item.icon className={`size-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
