import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Users, CalendarDays, ArrowUp, ArrowDown } from "lucide-react";

export const dynamic = "force-dynamic";

type TopMember = { rank: number; name: string; hours: number; billable: number };
type WeeklyDay = { day: string; hours: number };
type Summary = {
  totalHours: number;
  billableHours: number;
  totalEntries: number;
  avgDailyHours: number;
  activeProjects: number;
  teamMembers: number;
  weeklyChange: number;
  utilization: number;
  weeklyData: WeeklyDay[];
  topMembers: TopMember[];
};

export default async function TimeReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) {
    return <TimeReportsView data={null} />;
  }

  const TimeEntry = db.collection(collections.timeEntries);
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

  const [thisWeekEntries, lastWeekEntries, orgMembers] = await Promise.all([
    TimeEntry.find({ orgId, date: { $gte: oneWeekAgo, $lte: now } }).toArray(),
    TimeEntry.find({ orgId, date: { $gte: twoWeeksAgo, $lt: oneWeekAgo } }).toArray(),
    db.collection(collections.orgMembers).find({ orgId }).toArray(),
  ]);

  const thisWeekTotalMinutes = (thisWeekEntries as unknown as Record<string, unknown>[]).reduce((s, e) => s + ((e.duration as number) || 0), 0);
  const lastWeekTotalMinutes = (lastWeekEntries as unknown as Record<string, unknown>[]).reduce((s, e) => s + ((e.duration as number) || 0), 0);
  const totalHours = thisWeekTotalMinutes / 60;
  const lastWeekHours = lastWeekTotalMinutes / 60;
  const weeklyChange = lastWeekHours > 0 ? ((totalHours - lastWeekHours) / lastWeekHours) * 100 : 0;

  const billableMinutes = (thisWeekEntries as unknown as Record<string, unknown>[]).filter((e) => e.billable === true).reduce((s, e) => s + ((e.duration as number) || 0), 0);
  const billableHours = billableMinutes / 60;
  const utilization = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData: { day: string; hours: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(oneWeekAgo);
    dayStart.setDate(oneWeekAgo.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const dayMinutes = (thisWeekEntries as unknown as Record<string, unknown>[]).filter((e) => {
      const d = new Date(e.date as string);
      return d >= dayStart && d <= dayEnd;
    }).reduce((s, e) => s + ((e.duration as number) || 0), 0);
    weeklyData.push({ day: dayNames[dayStart.getDay()], hours: dayMinutes / 60 });
  }

  const projectSet = new Set<string>();
  (thisWeekEntries as unknown as Record<string, unknown>[]).forEach((e) => {
    if (e.project && typeof e.project === "string") projectSet.add(e.project);
  });

  const userMinutesMap = new Map<string, number>();
  (thisWeekEntries as unknown as Record<string, unknown>[]).forEach((e) => {
    const uid = e.userId as string;
    userMinutesMap.set(uid, (userMinutesMap.get(uid) || 0) + ((e.duration as number) || 0));
  });

  const topMembers: { rank: number; name: string; hours: number; billable: number }[] = [];
  const sortedUsers = [...userMinutesMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (let i = 0; i < sortedUsers.length; i++) {
    const [uid, minutes] = sortedUsers[i];
    const userDoc = (await db.collection(collections.users).findOne({ id: uid })) as Record<string, unknown> | null;
    topMembers.push({
      rank: i + 1,
      name: (userDoc?.name as string) || "Unknown",
      hours: minutes / 60,
      billable: minutes / 60,
    });
  }

  const data: Summary = {
    totalHours,
    billableHours,
    totalEntries: (thisWeekEntries as unknown[]).length,
    avgDailyHours: orgMembers.length > 0 ? totalHours / orgMembers.length : 0,
    activeProjects: projectSet.size,
    teamMembers: orgMembers.length,
    weeklyChange,
    utilization,
    weeklyData,
    topMembers,
  };

  return <TimeReportsView data={data} />;
}

function TimeReportsView({ data }: { data: Summary | null }) {
  const maxHours = data ? Math.max(1, ...data.weeklyData.map((d) => d.hours)) : 1;
  const changeDir = (data?.weeklyChange ?? 0) >= 0 ? "up" : "down";

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Time Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Weekly time tracking overview</p>
      </div>

      {!data ? (
        <div className="flex items-center justify-center py-20">
          <span className="ml-2 text-sm text-muted-foreground">No data available.</span>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="size-4 text-gray-700" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalHours.toFixed(1)}</div>
                <div className={`flex items-center gap-1 text-xs mt-1 ${changeDir === "up" ? "text-green-400" : "text-rose-600"}`}>
                  {changeDir === "up" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                  {Math.abs(data.weeklyChange).toFixed(1)}% vs last week
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
                <TrendingUp className="size-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.billableHours.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-1">{data.utilization}% utilization rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <CalendarDays className="size-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.activeProjects}</div>
                <p className="text-xs text-muted-foreground mt-1">{data.teamMembers} team members</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                <Users className="size-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.avgDailyHours}h</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  per team member
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Weekly Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {data.weeklyData.map((d) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                        style={{ height: `${(d.hours / maxHours) * 100}%` }}
                      />
                      <span className="text-xs text-muted-foreground">{d.hours.toFixed(0)}</span>
                      <span className="text-xs font-medium">{d.day}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Contributors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No entries this week.</p>
                  ) : (
                    data.topMembers.map((m) => (
                      <div key={m.rank} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-4">#{m.rank}</span>
                          <span className="text-sm">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{m.hours.toFixed(1)}h</span>
                          <Badge variant="outline" className="text-xs">{m.billable.toFixed(1)}h billable</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
