"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
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



export default function DashboardPage() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<Metrics>({totalTasks:0,completedTasks:0,inProgressTasks:0,overdueTasks:0,activeMembers:0,recentActivity:0});
  const [activities, setActivities] = useState<ActivityItem[]>([]);

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
            .catch((error) => {
              console.error("[DASHBOARD] Failed to fetch metrics:", error);
            });
          fetch(`/api/activity?orgId=${id}`, { credentials: "include" })
            .then((r) => r.json())
            .then((a) => setActivities(a.data || a || []))
            .catch((error) => {
              console.error("[DASHBOARD] Failed to fetch activity:", error);
            });
        }
      })
      .catch((error) => {
        console.error("[DASHBOARD] Failed to fetch profile:", error);
      });
  }, [session]);

  const cards = useMemo(() => [
    { title: "Total Tasks", value: metrics?.totalTasks ?? 0, icon: ListTodo, color: "text-muted-foreground" },
    { title: "Completed", value: metrics?.completedTasks ?? 0, icon: CheckCircle2, color: "text-destructive" },
    { title: "In Progress", value: metrics?.inProgressTasks ?? 0, icon: Clock, color: "text-destructive" },
    { title: "Overdue", value: metrics?.overdueTasks ?? 0, icon: AlertCircle, color: "text-destructive" },
    { title: "Active Members", value: metrics?.activeMembers ?? 0, icon: Users, color: "text-muted-foreground" },
    { title: "Activity (24h)", value: metrics?.recentActivity ?? 0, icon: Activity, color: "text-destructive" },
  ], [metrics]);

  return (
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
  );
}
