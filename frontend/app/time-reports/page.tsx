import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { BarChart3Icon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Time Reports",
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default async function TimeReportsPage() {
  const session = await auth();
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);

  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const monthEntries = await db
    .collection(collections.timeEntries)
    .find({
      orgId: "demo-org-id",
      date: { $gte: monthStart, $lte: nextMonth },
    })
    .toArray();

  const totalMinutes = monthEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const billableMinutes = monthEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration || 0), 0);
  const nonBillableMinutes = totalMinutes - billableMinutes;
  const avgDaily = monthEntries.length > 0
    ? Math.round(totalMinutes / new Set(monthEntries.map(e => e.date.toDateString())).size)
    : 0;

  const entriesByTask = monthEntries.reduce<Record<string, { title: string; minutes: number; count: number }>>(
    (acc, e) => {
      const key = e.taskId || "no-task";
      if (!acc[key]) {
        acc[key] = { title: "Unassigned", minutes: 0, count: 0 };
      }
      acc[key].minutes += e.duration || 0;
      acc[key].count += 1;
      return acc;
    },
    {},
  );

  if (monthEntries.some(e => e.taskId)) {
    const taskIds = [...new Set(monthEntries.map(e => e.taskId).filter(Boolean))] as string[];
    const tasks = taskIds.length > 0
      ? await db
          .collection(collections.tasks)
          .find({ id: { $in: taskIds } }, { projection: { id: 1, title: 1 } })
          .toArray()
      : [];
    const taskMap = Object.fromEntries(tasks.map(t => [t.id, t.title]));
    for (const e of monthEntries) {
      if (e.taskId && taskMap[e.taskId]) {
        const key = e.taskId;
        if (!entriesByTask[key]) {
          entriesByTask[key] = { title: taskMap[e.taskId], minutes: 0, count: 0 };
        }
        entriesByTask[key].title = taskMap[e.taskId];
      }
    }
  }

  const sortedTasks = Object.values(entriesByTask).sort((a, b) => b.minutes - a.minutes);

  const entriesByUser = await db
    .collection(collections.timeEntries)
    .aggregate([
      { $match: { orgId: "demo-org-id", date: { $gte: monthStart, $lte: nextMonth } } },
      { $group: { _id: "$userId", total: { $sum: "$duration" }, count: { $sum: 1 } } },
    ])
    .toArray();

  const userIds = entriesByUser.map(e => e._id);
  const userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const users = await db
      .collection(collections.users)
      .find({ id: { $in: userIds } }, { projection: { id: 1, name: 1 } })
      .toArray();
    for (const u of users) {
      userMap[u.id] = u.name;
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <BarChart3Icon className="size-6" />
            <h1 className="text-2xl font-bold">Time Reports</h1>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(totalMinutes)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Billable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{formatDuration(billableMinutes)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Non-Billable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{formatDuration(nonBillableMinutes)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Avg Daily</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(avgDaily)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>By Task</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No time entries this month.</p>
              ) : (
                <div className="space-y-3">
                  {sortedTasks.map((task) => (
                    <div key={task.title} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.count} entries</p>
                      </div>
                      <span className="font-semibold">{formatDuration(task.minutes)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By Team Member</CardTitle>
            </CardHeader>
            <CardContent>
              {entriesByUser.length === 0 ? (
                <p className="text-sm text-muted-foreground">No entries this month.</p>
              ) : (
                <div className="space-y-3">
                  {entriesByUser.map((entry) => (
                    <div key={entry._id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <p className="font-medium">{userMap[entry._id] || "Unknown"}</p>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{entry.count} entries</Badge>
                        <span className="font-semibold">{formatDuration(entry.total || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
