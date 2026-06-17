import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, desc, and, between } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { ClockIcon } from "lucide-react";

export const metadata = {
  title: "My Time",
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatTime(ts: Date): string {
  return ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default async function MyTimePage() {
  const session = await auth();
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const todayEntries = db
    .select()
    .from(schema.timeEntries)
    .where(
      and(
        eq(schema.timeEntries.userId, "demo-user-id"),
        between(schema.timeEntries.date, today, tomorrow),
      ),
    )
    .orderBy(desc(schema.timeEntries.startTime))
    .all();

  const todayMinutes = todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEntries = db
    .select()
    .from(schema.timeEntries)
    .where(
      and(
        eq(schema.timeEntries.userId, "demo-user-id"),
        between(schema.timeEntries.date, weekStart, tomorrow),
      ),
    )
    .orderBy(desc(schema.timeEntries.date))
    .all();

  const weekMinutes = weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="size-6" />
            <h1 className="text-2xl font-bold">My Time</h1>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatDuration(todayMinutes)}</div>
                <p className="text-xs text-muted-foreground mt-1">{todayEntries.length} entries</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatDuration(weekMinutes)}</div>
                <p className="text-xs text-muted-foreground mt-1">{weekEntries.length} entries</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Today's Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {todayEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No time entries for today. Start tracking!</p>
              ) : (
                <div className="space-y-3">
                  {todayEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{entry.description || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : "now"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.billable && <Badge variant="outline" className="text-xs">Billable</Badge>}
                        <span className="font-semibold">{formatDuration(entry.duration || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>This Week</CardTitle>
            </CardHeader>
            <CardContent>
              {weekEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No entries this week.</p>
              ) : (
                <div className="space-y-3">
                  {weekEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{entry.description || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.date.toLocaleDateString()} &middot;{" "}
                          {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : "now"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.billable && <Badge variant="outline" className="text-xs">Billable</Badge>}
                        <span className="font-semibold">{formatDuration(entry.duration || 0)}</span>
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
