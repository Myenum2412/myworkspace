import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ListTodo, CheckCircle2, Clock, AlertCircle,
  CalendarIcon, HourglassIcon,
} from "lucide-react";

export const revalidate = 30;

type DashboardData = {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  todayTasks: number;
  pendingApproval: number;
};

const getCachedDashboardData = unstable_cache(
  async (orgId: string): Promise<DashboardData> => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      tCount, doneCount, ipCount, overdueCount,
      todayCount, pendingCount,
    ] = await Promise.all([
      db.collection(collections.tasks).countDocuments({ orgId }),
      db.collection(collections.tasks).countDocuments({ orgId, status: "done" }),
      db.collection(collections.tasks).countDocuments({ orgId, status: "in_progress" }),
      db.collection(collections.tasks).countDocuments({ orgId, dueDate: { $lt: now }, status: { $ne: "done" } }),
      db.collection(collections.tasks).countDocuments({ orgId, createdAt: { $gte: todayStart } }),
      db.collection(collections.tasks).countDocuments({ orgId, status: "review" }),
    ]);

    return {
      totalTasks: tCount,
      completedTasks: doneCount,
      inProgressTasks: ipCount,
      overdueTasks: overdueCount,
      todayTasks: todayCount,
      pendingApproval: pendingCount,
    };
  },
  ["dashboard-data"],
  { revalidate: 30, tags: ["dashboard"] }
);

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let dashboardData: DashboardData | null = null;
  if (orgId) {
    dashboardData = await getCachedDashboardData(orgId);
  }

  const {
    totalTasks = 0, completedTasks = 0, inProgressTasks = 0, overdueTasks = 0,
    todayTasks = 0, pendingApproval = 0,
  } = dashboardData || {};

  const metricCards = [
    { title: "Total Task", value: totalTasks, icon: ListTodo, color: "text-muted-foreground" },
    { title: "Completed", value: completedTasks, icon: CheckCircle2, color: "text-green-600" },
    { title: "In Progress", value: inProgressTasks, icon: Clock, color: "text-blue-600" },
    { title: "Overdue", value: overdueTasks, icon: AlertCircle, color: "text-red-600" },
    { title: "Today Task", value: todayTasks, icon: CalendarIcon, color: "text-purple-600" },
    { title: "Pending Approval", value: pendingApproval, icon: HourglassIcon, color: "text-amber-600" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-2 sm:gap-3 md:gap-4 min-w-0 max-w-full">
      <h1 className="text-xl sm:text-2xl font-bold px-0.5">Dashboard Overview</h1>

      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-6">
        {metricCards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{c.title}</CardTitle>
              <c.icon className={`size-3.5 sm:size-4 shrink-0 ${c.color}`} />
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="text-lg sm:text-xl md:text-2xl font-bold truncate">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
