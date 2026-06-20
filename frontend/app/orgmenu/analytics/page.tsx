import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUpIcon, UsersIcon, CheckCircle2Icon, BarChart2Icon } from "lucide-react";

export const metadata = { title: "Analytics" };

const getAnalytics = cache(async (orgId: string) => {
  try {
    const totalTasks = await db.collection(collections.tasks).countDocuments({ orgId });
    const completedTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "done" });
    const activeMembers = await db.collection(collections.orgMembers).countDocuments({ orgId });
    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { totalTasks, completedTasks, activeMembers, completionRate };
  } catch {
    return { totalTasks: 0, completedTasks: 0, activeMembers: 0, completionRate: 0 };
  }
});

export default async function AnalyticsPage() {
  const session = await auth();
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;
  const analytics = await getAnalytics(orgId || "null");
  const items = [
    { title: "Total Tasks", value: analytics.totalTasks, icon: BarChart2Icon, color: "text-blue-500" },
    { title: "Completed", value: analytics.completedTasks, icon: CheckCircle2Icon, color: "text-emerald-500" },
    { title: "Completion Rate", value: `${analytics.completionRate}%`, icon: TrendingUpIcon, color: "text-purple-500" },
    { title: "Active Members", value: analytics.activeMembers, icon: UsersIcon, color: "text-amber-500" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>
      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
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
      <div className="min-h-[300px] flex-1 rounded-xl bg-muted/50 flex items-center justify-center">
        <p className="text-muted-foreground">Analytics charts and visualizations</p>
      </div>
    </div>
  );
}
