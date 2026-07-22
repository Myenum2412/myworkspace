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
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  Loader2Icon, SendIcon, MailIcon, CheckCircle2Icon,
  AlertCircleIcon, BarChart3Icon, TrendingUpIcon,
  ActivityIcon, HeartPulseIcon, SearchIcon, FilterIcon, ClockIcon,
} from "lucide-react";

const COLORS = {
  critical: "#ef4444", high: "#f97316", medium: "#3b82f6", low: "#94a3b8",
};

const STATUS_BADGE_VARIANTS: Record<string, string> = {
  sent: "bg-green-500/10 text-green-500 border-green-500/20",
  delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
  bounced: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  queued: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

function StatusBadge({ status }: { status: string }) {
  const variantClass = STATUS_BADGE_VARIANTS[status] || "";
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${variantClass}`}>
      {status}
    </Badge>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">&nbsp;</CardTitle></CardHeader>
      <CardContent>
        <div className="h-8 w-20 animate-pulse rounded-sm bg-muted" />
      </CardContent>
    </Card>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-sm bg-muted" />
      ))}
    </div>
  );
}

export default function AdminNotificationsPage() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastPriority, setBroadcastPriority] = useState("high");
  const [broadcasting, setBroadcasting] = useState(false);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [emailLogTotal, setEmailLogTotal] = useState(0);

  const [health, setHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [liveStatsLoading, setLiveStatsLoading] = useState(true);

  const [emailLogSearch, setEmailLogSearch] = useState("");
  const [emailLogStatus, setEmailLogStatus] = useState("all");
  const [emailLogFromDate, setEmailLogFromDate] = useState("");
  const [emailLogToDate, setEmailLogToDate] = useState("");
  const [emailLogPage, setEmailLogPage] = useState(1);
  const [emailLogTotalPages, setEmailLogTotalPages] = useState(1);
  const [emailLogLoading, setEmailLogLoading] = useState(false);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadAnalytics();
    loadEmailLogs(1);
    loadHealth();
    loadTemplates();
    loadLiveStats();
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

  const loadHealth = async () => {
    try {
      const res = await fetch("/api/admin/notifications/health", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setHealth(d.data || d);
      }
    } catch {} finally { setHealthLoading(false); }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch("/api/admin/notifications/templates", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setTemplates(d.data || d.templates || []);
      }
    } catch {} finally { setTemplatesLoading(false); }
  };

  const loadLiveStats = async () => {
    try {
      const res = await fetch("/api/admin/notifications/stats/live", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setLiveStats(d.data || d);
      }
    } catch {} finally { setLiveStatsLoading(false); }
  };

  const loadEmailLogs = useCallback(async (page: number) => {
    setEmailLogLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(ITEMS_PER_PAGE));
      params.set("page", String(page));
      if (emailLogSearch) params.set("search", emailLogSearch);
      if (emailLogStatus !== "all") params.set("status", emailLogStatus);
      if (emailLogFromDate) params.set("from", emailLogFromDate);
      if (emailLogToDate) params.set("to", emailLogToDate);

      const res = await fetch(`/api/notifications/email-logs?${params.toString()}`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setEmailLogs(d.data?.logs || []);
        setEmailLogTotal(d.data?.total || 0);
        setEmailLogTotalPages(Math.max(1, Math.ceil((d.data?.total || 0) / ITEMS_PER_PAGE)));
      }
    } catch {} finally { setEmailLogLoading(false); }
  }, [emailLogSearch, emailLogStatus, emailLogFromDate, emailLogToDate]);

  useEffect(() => {
    setEmailLogPage(1);
    loadEmailLogs(1);
  }, [emailLogSearch, emailLogStatus, emailLogFromDate, emailLogToDate]);

  useEffect(() => {
    loadEmailLogs(emailLogPage);
  }, [emailLogPage]);

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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setEmailLogPage(1);
      loadEmailLogs(1);
    }
  };

  const priorityData = analytics?.byPriority
    ? Object.entries(analytics.byPriority).map(([k, v]) => ({ name: k, value: v, color: COLORS[k as keyof typeof COLORS] }))
    : [];

  const categoryData = analytics?.byCategory
    ? Object.entries(analytics.byCategory).map(([k, v]) => ({ name: k, value: v })).slice(0, 8)
    : [];

  const healthStatusColor = health?.overall === "healthy" ? "text-green-500"
    : health?.overall === "degraded" ? "text-yellow-500"
    : health?.overall === "unhealthy" ? "text-red-500"
    : "text-muted-foreground";

  const liveErrorRate = liveStats?.totalSent && liveStats?.totalSent > 0
    ? ((liveStats.totalErrors / liveStats.totalSent) * 100).toFixed(1)
    : "0.0";

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
                  className="flex w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring min-h-[100px]" />
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

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <HeartPulseIcon className="size-4" />
                  System Health
                </CardTitle>
                <CardDescription>Current status of notification subsystems</CardDescription>
              </CardHeader>
              <CardContent>
                {healthLoading ? (
                  <div className="grid grid-cols-3 gap-4">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : health ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold capitalize ${healthStatusColor}`}>
                        {health.overall || "unknown"}
                      </span>
                      <Badge variant="outline" className={healthStatusColor}>
                        {health.overall === "healthy" ? "All Systems Operational" : "Issues Detected"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: "Database", key: "database", status: health.database },
                        { label: "Queue", key: "queue", status: health.queue },
                        { label: "SMTP", key: "smtp", status: health.smtp },
                        { label: "VAPID", key: "vapid", status: health.vapid },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between rounded-sm border p-3">
                          <span className="text-xs text-muted-foreground">{item.label}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 ${
                            item.status === "healthy" || item.status === "ok"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : item.status === "degraded"
                                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                : item.status
                                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                                  : "bg-muted text-muted-foreground"
                          }`}>
                            {item.status || "unknown"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Notifications (1h)</p>
                        <p className="text-lg font-bold">{health.notificationsInLastHour ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Failed Emails (1h)</p>
                        <p className="text-lg font-bold text-red-500">{health.failedEmailsInLastHour ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pending Emails</p>
                        <p className="text-lg font-bold text-yellow-500">{health.pendingEmails ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">Unable to load health data</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ActivityIcon className="size-4" />
                  Live Metrics
                </CardTitle>
                <CardDescription>In-memory counters (since last restart)</CardDescription>
              </CardHeader>
              <CardContent>
                {liveStatsLoading ? (
                  <div className="space-y-3">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : liveStats ? (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Sent</p>
                      <p className="text-2xl font-bold">{liveStats.totalSent ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Errors</p>
                      <p className="text-2xl font-bold text-red-500">{liveStats.totalErrors ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Error Rate</p>
                      <div className="flex items-center gap-3">
                        <Progress value={parseFloat(liveErrorRate)} className="h-2 flex-1" />
                        <span className={`text-sm font-semibold ${
                          parseFloat(liveErrorRate) > 10 ? "text-red-500"
                            : parseFloat(liveErrorRate) > 5 ? "text-yellow-500"
                            : "text-green-500"
                        }`}>
                          {liveErrorRate}%
                        </span>
                      </div>
                    </div>
                    {liveStats.uptimeSeconds != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Uptime</p>
                        <p className="text-lg font-bold">
                          {liveStats.uptimeSeconds < 3600
                            ? `${Math.floor(liveStats.uptimeSeconds / 60)}m`
                            : `${(liveStats.uptimeSeconds / 3600).toFixed(1)}h`}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">Unable to load live stats</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MailIcon className="size-4" />
                Email Templates
              </CardTitle>
              <CardDescription>Configured notification email templates</CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <SkeletonTable />
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No templates found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((tpl: any, i: number) => (
                      <TableRow key={tpl._id || i}>
                        <TableCell className="font-mono text-xs">{tpl.type}</TableCell>
                        <TableCell className="text-sm">{tpl.subject}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{tpl.category || "general"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={tpl.enabled !== false}
                            onCheckedChange={() => {}}
                            disabled
                            aria-label={`Toggle ${tpl.type}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MailIcon className="size-4" />
                Email Activity Log
              </CardTitle>
              <CardDescription>Delivery status of email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subject or recipient..."
                    value={emailLogSearch}
                    onChange={(e) => setEmailLogSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="pl-8 bg-white"
                  />
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Select value={emailLogStatus} onValueChange={setEmailLogStatus}>
                    <SelectTrigger className="w-28">
                      <FilterIcon className="size-3.5 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                      <SelectItem value="bounced">Bounced</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Input
                      type="date"
                      value={emailLogFromDate}
                      onChange={(e) => setEmailLogFromDate(e.target.value)}
                      className="w-36 text-xs"
                      placeholder="From"
                    />
                    <span className="text-xs text-muted-foreground">—</span>
                    <Input
                      type="date"
                      value={emailLogToDate}
                      onChange={(e) => setEmailLogToDate(e.target.value)}
                      className="w-36 text-xs"
                      placeholder="To"
                    />
                  </div>
                </div>
              </div>

              {emailLogLoading ? (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-sm bg-muted" />
                  ))}
                </div>
              ) : emailLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No email logs found</p>
              ) : (
                <>
                  <div className="space-y-1">
                    {emailLogs.map((log: any) => (
                      <div key={log._id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {log.status === "sent" || log.status === "delivered" ? (
                            <CheckCircle2Icon className="size-3.5 text-green-500 shrink-0" />
                          ) : log.status === "failed" || log.status === "bounced" ? (
                            <AlertCircleIcon className="size-3.5 text-red-500 shrink-0" />
                          ) : (
                            <ClockIcon className="size-3.5 text-amber-500 shrink-0" />
                          )}
                          <span className="text-xs truncate">{log.subject || log.template}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">{log.to}</span>
                          <StatusBadge status={log.status} />
                          <span className="text-[10px] text-muted-foreground">{log.deliveryAttempts}x</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      {emailLogTotal} total result{emailLogTotal !== 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={emailLogPage <= 1}
                        onClick={() => setEmailLogPage((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </Button>
                      <span className="text-xs text-muted-foreground px-2">
                        {emailLogPage} / {emailLogTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={emailLogPage >= emailLogTotalPages}
                        onClick={() => setEmailLogPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
