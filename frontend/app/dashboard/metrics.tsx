import { cache } from "react";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2Icon, ClockIcon, AlertCircleIcon, UsersIcon } from "lucide-react";

const getMetrics = cache(async (orgId: string) => {
  const totalTasks = db
    .select({ count: count() })
    .from(schema.tasks)
    .where(eq(schema.tasks.orgId, orgId))
    .all();

  const completedTasks = db
    .select({ count: count() })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.orgId, orgId), eq(schema.tasks.status, "done")))
    .all();

  const inProgressTasks = db
    .select({ count: count() })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.orgId, orgId), eq(schema.tasks.status, "in_progress")))
    .all();

  const overdueTasks = db
    .select({ count: count() })
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.orgId, orgId),
        sql`${schema.tasks.dueDate} < ${Date.now()}`,
        sql`${schema.tasks.status} != 'done'`
      )
    )
    .all();

  const memberCount = db
    .select({ count: count() })
    .from(schema.orgMembers)
    .where(eq(schema.orgMembers.orgId, orgId))
    .all();

  return {
    totalTasks: totalTasks[0]?.count ?? 0,
    completedTasks: completedTasks[0]?.count ?? 0,
    inProgressTasks: inProgressTasks[0]?.count ?? 0,
    overdueTasks: overdueTasks[0]?.count ?? 0,
    memberCount: memberCount[0]?.count ?? 0,
  };
});

export async function DashboardMetrics({ orgId }: { orgId: string }) {
  const metrics = await getMetrics(orgId);

  const items = [
    { title: "Total Tasks", value: metrics.totalTasks, icon: ClockIcon, color: "text-blue-500" },
    { title: "Completed", value: metrics.completedTasks, icon: CheckCircle2Icon, color: "text-emerald-500" },
    { title: "In Progress", value: metrics.inProgressTasks, icon: AlertCircleIcon, color: "text-amber-500" },
    { title: "Overdue", value: metrics.overdueTasks, icon: AlertCircleIcon, color: "text-red-500" },
    { title: "Team Members", value: metrics.memberCount, icon: UsersIcon, color: "text-violet-500" },
  ];

  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-5">
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
  );
}
