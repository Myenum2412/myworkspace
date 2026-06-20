"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListTodo, CheckCircle2, Clock, AlertCircle, Users, Activity } from "lucide-react";

type Metrics = {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  activeMembers: number;
  recentActivity: number;
};

type ActivityItem = {
  _id: string;
  action: string;
  description: string;
  userId: string;
  createdAt: string;
};

const FAKE_METRICS: Metrics = {
  totalTasks: 45,
  completedTasks: 18,
  inProgressTasks: 15,
  overdueTasks: 5,
  activeMembers: 24,
  recentActivity: 12,
};

const FAKE_ACTIVITIES: ActivityItem[] = [
  { _id: "act_1", action: "task.completed", description: "Completed homepage redesign", userId: "user_1", createdAt: "2026-06-19T10:30:00Z" },
  { _id: "act_2", action: "user.joined", description: "Sarah Kim joined Engineering team", userId: "user_2", createdAt: "2026-06-19T09:15:00Z" },
  { _id: "act_3", action: "file.uploaded", description: "Uploaded Q2 financial report", userId: "user_3", createdAt: "2026-06-19T08:45:00Z" },
  { _id: "act_4", action: "task.created", description: "Created new task: API integration", userId: "user_4", createdAt: "2026-06-18T16:20:00Z" },
  { _id: "act_5", action: "user.updated", description: "James Wilson promoted to Team Lead", userId: "user_5", createdAt: "2026-06-18T14:10:00Z" },
  { _id: "act_6", action: "task.completed", description: "Database migration script finished", userId: "user_1", createdAt: "2026-06-18T11:00:00Z" },
  { _id: "act_7", action: "task.created", description: "New project: Cloud Migration initiated", userId: "user_3", createdAt: "2026-06-18T09:30:00Z" },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const id = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (id) {
          fetch(`/api/dashboard/metrics?orgId=${id}`, { credentials: "include" })
            .then((r) => r.json())
            .then((m) => setMetrics(m.data || m))
            .catch(() => setMetrics(FAKE_METRICS));
          fetch(`/api/activity?orgId=${id}`, { credentials: "include" })
            .then((r) => r.json())
            .then((a) => setActivities(a.data || a || []))
            .catch(() => setActivities(FAKE_ACTIVITIES));
        }
      })
      .catch(() => { setMetrics(FAKE_METRICS); setActivities(FAKE_ACTIVITIES); });
  }, [session]);

  const cards = [
    { title: "Total Tasks", value: metrics?.totalTasks ?? 0, icon: ListTodo, color: "text-blue-600" },
    { title: "Completed", value: metrics?.completedTasks ?? 0, icon: CheckCircle2, color: "text-emerald-600" },
    { title: "In Progress", value: metrics?.inProgressTasks ?? 0, icon: Clock, color: "text-amber-600" },
    { title: "Overdue", value: metrics?.overdueTasks ?? 0, icon: AlertCircle, color: "text-red-600" },
    { title: "Active Members", value: metrics?.activeMembers ?? 0, icon: Users, color: "text-violet-600" },
    { title: "Activity (24h)", value: metrics?.recentActivity ?? 0, icon: Activity, color: "text-cyan-600" },
  ];

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {cards.map((c) => (
              <Card key={c.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
                  <c.icon className={`size-4 ${c.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{c.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div key={a._id} className="flex items-center gap-3 text-sm">
                      <Badge variant="secondary" className="shrink-0">{a.action.replace("user.", "").replace("task.", "").replace("file.", "")}</Badge>
                      <span className="flex-1 truncate">{a.description}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
