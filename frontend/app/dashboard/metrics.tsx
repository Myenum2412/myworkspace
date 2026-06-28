import { cache } from "react";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2Icon, ClockIcon, AlertCircleIcon, UsersIcon } from "lucide-react";

const getMetrics = cache(async (orgId: string) => {
  const totalTasks = await db.collection(collections.tasks).countDocuments({ orgId });
  const completedTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "done" });
  const inProgressTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "in_progress" });
  const overdueTasks = await db.collection(collections.tasks).countDocuments({
    orgId,
    dueDate: { $lt: Date.now() },
    status: { $ne: "done" },
  });
  const memberCount = await db.collection(collections.orgMembers).countDocuments({ orgId });

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    memberCount,
  };
});

export async function DashboardMetrics({ orgId }: { orgId: string }) {
  const metrics = await getMetrics(orgId);

  const items = [
    { title: "Total Tasks", value: metrics.totalTasks, icon: ClockIcon, color: "text-primary" },
    { title: "Completed", value: metrics.completedTasks, icon: CheckCircle2Icon, color: "text-primary" },
    { title: "In Progress", value: metrics.inProgressTasks, icon: AlertCircleIcon, color: "text-destructive" },
    { title: "Overdue", value: metrics.overdueTasks, icon: AlertCircleIcon, color: "text-primary" },
    { title: "Team Members", value: metrics.memberCount, icon: UsersIcon, color: "text-muted-foreground" },
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
