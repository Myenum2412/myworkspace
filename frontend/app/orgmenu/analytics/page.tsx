import { cache } from "react";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3Icon, TrendingUpIcon, UsersIcon, CheckCircle2Icon } from "lucide-react";

export const metadata = { title: "Analytics" };

const getAnalytics = cache(async (orgId: string) => {
  const totalTasks = db.select({ count: count() }).from(schema.tasks).where(eq(schema.tasks.orgId, orgId)).all();
  const completedTasks = db.select({ count: count() }).from(schema.tasks).where(and(eq(schema.tasks.orgId, orgId), eq(schema.tasks.status, "done"))).all();
  const activeMembers = db.select({ count: count() }).from(schema.orgMembers).where(eq(schema.orgMembers.orgId, orgId)).all();
  const completionRate = totalTasks[0]?.count ? Math.round(((completedTasks[0]?.count ?? 0) / totalTasks[0].count) * 100) : 0;

  return { totalTasks: totalTasks[0]?.count ?? 0, completedTasks: completedTasks[0]?.count ?? 0, activeMembers: activeMembers[0]?.count ?? 0, completionRate };
});

export default async function AnalyticsPage() {
  const analytics = await getAnalytics("demo-org-id");
  const items = [
    { title: "Total Tasks", value: analytics.totalTasks, icon: BarChart3Icon, color: "text-blue-500" },
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
