"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  Loader2Icon, SendIcon, BellIcon, MailIcon, CheckCircle2Icon,
  AlertCircleIcon, BarChart3Icon, TrendingUpIcon,
} from "lucide-react";

const COLORS = {
  critical: "#ef4444", high: "#f97316", medium: "#3b82f6", low: "#94a3b8",
};

export default function AdminNotificationsPage() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastPriority, setBroadcastPriority] = useState("high");
  const [broadcasting, setBroadcasting] = useState(false);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
    loadEmailLogs();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await fetch("/api/notifications/analytics", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setAnalytics(d.data);
      }
    } catch {} finally { setLoading(false); }
  };

  const loadEmailLogs = async () => {
    try {
      const res = await fetch("/api/notifications/email-logs?limit=20", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setEmailLogs(d.data?.logs || []);
      }
    } catch {}
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) return;
    setBroadcasting(true);
    try {
      await fetch("/api/notifications/broadcast", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          priority: broadcastPriority,
        }),
      });
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch {} finally { setBroadcasting(false); }
  };

  const priorityData = analytics?.byPriority
    ? Object.entries(analytics.byPriority).map(([k, v]) => ({ name: k, value: v, color: COLORS[k as keyof typeof COLORS] }))
    : [];

  const categoryData = analytics?.byCategory
    ? Object.entries(analytics.byCategory).map(([k, v]) => ({ name: k, value: v })).slice(0, 8)
    : [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Notification Administration</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage notification system and view analytics</p>
      </div>

      <Separator />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Sent</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{analytics?.totalSent || 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Read</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{analytics?.totalRead || 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Archived</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{analytics?.totalArchived || 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Read Rate</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{analytics?.readRate || 0}%</p></CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><BarChart3Icon className="size-4" />Daily Notification Volume</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics?.dailyCounts?.slice(-30) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><TrendingUpIcon className="size-4" />Notifications by Priority</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={priorityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name }) => name}>
                      {priorityData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <SendIcon className="size-4" />
                Broadcast Notification
              </CardTitle>
              <CardDescription>Send a notification to all users or selected roles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Notification title" />
              </div>
              <div>
                <Label>Message</Label>
                <textarea value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Notification message"
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring min-h-[100px]" />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={broadcastPriority} onValueChange={setBroadcastPriority}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleBroadcast} disabled={broadcasting || !broadcastTitle || !broadcastMessage} className="mt-5 gap-1.5">
                  {broadcasting ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
                  Send Broadcast
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MailIcon className="size-4" />
                Recent Email Activity
              </CardTitle>
              <CardDescription>Delivery status of recent email notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {emailLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No email logs yet</p>
                ) : (
                  emailLogs.slice(0, 10).map((log: any) => (
                    <div key={log._id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {log.status === "sent" || log.status === "delivered" ? (
                          <CheckCircle2Icon className="size-3.5 text-green-500 shrink-0" />
                        ) : log.status === "failed" || log.status === "bounced" ? (
                          <AlertCircleIcon className="size-3.5 text-red-500 shrink-0" />
                        ) : (
                          <Loader2Icon className="size-3.5 text-amber-500 shrink-0 animate-spin" />
                        )}
                        <span className="text-xs truncate">{log.subject || log.template}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">{log.to}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{log.status}</Badge>
                        <span className="text-[10px] text-muted-foreground">{log.deliveryAttempts}x</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
