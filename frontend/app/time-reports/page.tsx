"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Users, CalendarDays, ArrowUp, ArrowDown, Loader2 } from "lucide-react";

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

export default function TimeReportsPage() {
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/user/me", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/time-entries/summary", { credentials: "include" }).then((r) => (r.ok ? r.json() : Promise.reject(r))),
    ])
      .then(([u, s]) => {
        if (!alive) return;
        setUser({ name: u?.name || "User", email: u?.email || "", avatar: u?.image || "" });
        setData(s);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const maxHours = data ? Math.max(1, ...data.weeklyData.map((d) => d.hours)) : 1;
  const changeDir = (data?.weeklyChange ?? 0) >= 0 ? "up" : "down";

  return (
                                <main className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-2xl font-bold">Time Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">Weekly time tracking overview</p>
          </div>

          {loading || !data ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading real-time data…</span>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                    <Clock className="size-4 text-[#4c6a45]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.totalHours.toFixed(1)}</div>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${changeDir === "up" ? "text-emerald-600" : "text-rose-600"}`}>
                      {changeDir === "up" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                      {Math.abs(data.weeklyChange).toFixed(1)}% vs last week
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
                    <TrendingUp className="size-4 text-emerald-600" />
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
