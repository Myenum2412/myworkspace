"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Clock, Calendar, Loader2, Trash2 } from "lucide-react";

interface TimeEntry {
  id: string;
  userId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  description: string;
  billable: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function MyTimePage() {
  const [user, setUser] = useState({ name: "", email: "", avatar: "", id: "" });
  const [orgId, setOrgId] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "", id: u.id || "" }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user.id) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const id = profile?.org?.id || profile?.org?._id?.toString() || "";
        setOrgId(id);
      })
      .catch(() => {});
  }, [user.id]);

  useEffect(() => {
    if (!orgId || !user.id) return;
    setLoading(true);
    const params = new URLSearchParams({ orgId, userId: user.id });
    if (date) params.set("date", date.toISOString().slice(0, 10));

    fetch(`/api/time-entries?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((res) => setEntries(res.data || res || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId, user.id, date]);

  const totalMinutes = entries.reduce((s, e) => s + e.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">My Time</h1>
              <p className="text-sm text-muted-foreground mt-1">Track your logged hours</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors">
                  <Calendar className="size-4" />
                  {date ? date.toDateString() === new Date().toDateString() ? "Today" : date.toLocaleDateString() : "Select date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarUI mode="single" selected={date} onSelect={setDate} />
              </PopoverContent>
            </Popover>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4" />
                {totalHours}h logged
                <Badge variant="secondary">{entries.length} entries</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="size-10 mb-3 opacity-50" />
                  <p>No time entries for this date</p>
                  <p className="text-sm">Go to Time Tracker to log your hours</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Description</th>
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 font-medium">Duration</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4">
                            <p className="text-sm font-medium">{entry.description || "No description"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString()}
                              {entry.startTime && entry.endTime && ` · ${entry.startTime} - ${entry.endTime}`}
                            </p>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-sm">
                              {entry.startTime && entry.endTime
                                ? `${entry.startTime} - ${entry.endTime}`
                                : "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-sm font-mono font-medium">
                              {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge className={statusColors[entry.status]}>
                              {entry.status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-muted-foreground hover:text-red-600 transition-colors"
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
      </SidebarInset>
    </SidebarProvider>
  );
}
