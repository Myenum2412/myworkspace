"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, TrendingUp, TimerIcon, BarChart3, Trash2, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Entry {
  id: string;
  userId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  description: string;
  projectId?: string;
  projectName?: string;
  billable: boolean;
  status: string;
  createdAt: string;
}

function calcDuration(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

function entryMinutes(e: Entry): number {
  if (e.duration > 0) return e.duration;
  return calcDuration(e.startTime, e.endTime);
}

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function TimeTrackerOverview({ data: initialData }: { data: Entry[] | null }) {
  const [data, setData] = useState<Entry[] | null>(initialData);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok && data) setData((prev) => prev ? prev.filter((e) => e.id !== id) : null);
  };

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const totalMin = data.reduce((s, e) => s + entryMinutes(e), 0);
    const totalHours = totalMin / 60;

    const today = new Date().toISOString().slice(0, 10);
    const todayMin = data.filter((e) => e.date === today).reduce((s, e) => s + entryMinutes(e), 0);
    const todayHours = todayMin / 60;

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = 0;
    }
    data.forEach((e) => {
      if (dayMap[e.date] !== undefined) dayMap[e.date] += entryMinutes(e);
    });

    const weeklyData = Object.entries(dayMap).map(([date, min]) => ({
      day: dayNames[new Date(date).getDay()],
      hours: +(min / 60).toFixed(1),
    }));

    const billableMin = data.filter((e) => e.billable).reduce((s, e) => s + entryMinutes(e), 0);
    const billableHours = billableMin / 60;
    const utilization = totalHours > 0 ? +((billableHours / totalHours) * 100).toFixed(1) : 0;

    const projectMap: Record<string, number> = {};
    data.forEach((e) => {
      const name = e.projectName || "Unassigned";
      projectMap[name] = (projectMap[name] || 0) + entryMinutes(e);
    });
    const projectData = Object.entries(projectMap)
      .map(([name, min]) => ({ name, hours: +(min / 60).toFixed(1) }))
      .sort((a, b) => b.hours - a.hours);

    const avgDaily = weeklyData.length > 0 ? +(totalHours / weeklyData.filter((d) => d.hours > 0).length || 1).toFixed(1) : 0;

    const uniqueDays = new Set(data.map((e) => e.date));

    return {
      totalHours: +totalHours.toFixed(1),
      todayHours: +todayHours.toFixed(1),
      totalEntries: data.length,
      activeDays: uniqueDays.size,
      avgDaily,
      billableHours: +billableHours.toFixed(1),
      utilization,
      weeklyData,
      projectData,
    };
  }, [data]);

  const maxHours = stats ? Math.max(1, ...stats.weeklyData.map((d) => d.hours)) : 1;

  if (!data || !stats) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4">
        <h1 className="text-2xl font-bold">Time Tracker</h1>
        <p className="text-sm text-muted-foreground">Weekly overview of your tracked time</p>
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-2">
            <Clock className="size-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No time entries this week</p>
            <p className="text-xs text-muted-foreground">Log your time from the My Time page</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Time Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">Weekly overview of your tracked time</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalHours}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.totalEntries} entries this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <TimerIcon className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.todayHours}h</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeDays} active days this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
            <TrendingUp className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.billableHours}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.utilization}% utilization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <BarChart3 className="size-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.avgDaily}h</p>
            <p className="text-xs text-muted-foreground mt-1">per active day</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Hours This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {stats.weeklyData.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">{d.hours > 0 ? d.hours : ""}</span>
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${(d.hours / maxHours) * 100}%`, minHeight: d.hours > 0 ? 4 : 0 }}
                  />
                  <span className="text-xs font-medium">{d.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By Project</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.projectData.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                No project data
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={stats.projectData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="hours">
                      {stats.projectData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {stats.projectData.slice(0, 5).map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="size-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="truncate max-w-[100px]">{p.name}</span>
                      </div>
                      <span className="font-medium">{p.hours}h</span>
                    </div>
                  ))}
                </div>
          </div>
            )}
        </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No entries this week</p>
          ) : (
            <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-[#f3f4f6]">
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Description</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Project</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Time</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Duration</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                      <td className="px-4 py-3 text-sm font-medium">{entry.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{entry.projectName || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {entry.startTime && entry.endTime ? `${entry.startTime} - ${entry.endTime}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono font-medium">
                        {Math.floor(entryMinutes(entry) / 60)}h {entryMinutes(entry) % 60}m
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
