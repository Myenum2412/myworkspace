import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { UsersIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Team Time",
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default async function TeamTimePage() {
  const session = await auth();
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const teamMembers = await db
    .collection(collections.orgMembers)
    .find({ orgId: "demo-org-id" })
    .toArray();

  const memberIds = teamMembers.map(m => m.userId);
  const users = memberIds.length > 0
    ? await db
        .collection(collections.users)
        .find({ id: { $in: memberIds } })
        .toArray()
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const memberTimeSummary = await Promise.all(
    teamMembers.map(async (membership) => {
      const memberUser = userMap[membership.userId];
      if (!memberUser) return null;

      const todayEntries = await db
        .collection(collections.timeEntries)
        .find({
          userId: membership.userId,
          date: { $gte: today, $lte: tomorrow },
        })
        .toArray();

      const weekEntries = await db
        .collection(collections.timeEntries)
        .find({
          userId: membership.userId,
          date: { $gte: weekStart, $lte: tomorrow },
        })
        .toArray();

      const todayMinutes = todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
      const weekMinutes = weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

      const lastEntry = [...weekEntries].sort((a, b) => (b.startTime as Date).getTime() - (a.startTime as Date).getTime())[0];

      return { user: memberUser, todayMinutes, weekMinutes, lastEntry, entryCount: weekEntries.length };
    }),
  ) as { user: Record<string, unknown>; todayMinutes: number; weekMinutes: number; lastEntry: Record<string, unknown> | undefined; entryCount: number }[];

  const allThisWeek = await db
    .collection(collections.timeEntries)
    .find({
      orgId: "demo-org-id",
      date: { $gte: weekStart, $lte: tomorrow },
    })
    .toArray();

  const teamWeekMinutes = allThisWeek.reduce((sum, e) => sum + (e.duration || 0), 0);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-6" />
            <h1 className="text-2xl font-bold">Team Time</h1>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{teamMembers.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Team Hours This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatDuration(teamWeekMinutes)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{allThisWeek.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Member Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {memberTimeSummary.map((item) => {
                  const member = item.user as { id: string; name: string; image?: string; [k: string]: unknown };
                  const { todayMinutes, weekMinutes, lastEntry, entryCount } = item;
                  return (
                  <div key={member.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="text-xs">
                          {member.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entryCount > 0
                            ? `Last entry: ${(lastEntry!.startTime as Date).toLocaleDateString()}`
                            : "No entries this week"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">Today</p>
                        <p className="font-semibold">{formatDuration(todayMinutes)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Week</p>
                        <p className="font-semibold">{formatDuration(weekMinutes)}</p>
                      </div>
                      {todayMinutes > 0 && <Badge>Active</Badge>}
                    </div>
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
