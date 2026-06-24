"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3Icon, Loader2Icon, TrendingUpIcon, UsersIcon, CheckCircle2Icon, ClockIcon } from "lucide-react";

type Task = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
};



export default function ReportsPage() {
  const { data: session } = useSession();
    const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const id = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (id) {
          fetch(`/api/tasks?orgId=${id}`, { credentials: "include" })
            .then((r) => r.json())
            .then((res) => setTasks(res.data || res || []))
            .catch(() => {})
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => { setLoading(false); });
  }, [session]);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done" && t.status !== "cancelled").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const priorityBreakdown = [
    { label: "Urgent", count: tasks.filter((t) => t.priority === "urgent").length, color: "bg-red-500" },
    { label: "High", count: tasks.filter((t) => t.priority === "high").length, color: "bg-orange-500" },
    { label: "Medium", count: tasks.filter((t) => t.priority === "medium").length, color: "bg-[#5f7d56]" },
    { label: "Low", count: tasks.filter((t) => t.priority === "low").length, color: "bg-gray-400" },
  ];

  return (
                                <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <BarChart3Icon className="size-6" />
            <h1 className="text-2xl font-bold">Reports</h1>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3Icon className="size-4" /> Total Tasks</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2Icon className="size-4" /> Completed</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-emerald-500">{completed}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><ClockIcon className="size-4" /> In Progress</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-amber-500">{inProgress}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUpIcon className="size-4" /> Completion Rate</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{completionRate}%</div></CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Priority Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    {total === 0 ? (
                      <p className="text-sm text-muted-foreground">No task data available.</p>
                    ) : (
                      <div className="space-y-3">
                        {priorityBreakdown.map((p) => (
                          <div key={p.label} className="flex items-center gap-3">
                            <div className={`size-3 rounded-full ${p.color}`} />
                            <span className="text-sm flex-1">{p.label}</span>
                            <span className="text-sm font-bold">{p.count}</span>
                            <div className="w-24 h-2 rounded-full bg-muted">
                              <div className={`h-2 rounded-full ${p.color}`} style={{ width: `${total > 0 ? (p.count / total) * 100 : 0}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Status Overview</CardTitle></CardHeader>
                  <CardContent>
                    {total === 0 ? (
                      <p className="text-sm text-muted-foreground">No task data available.</p>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { label: "To Do", count: tasks.filter((t) => t.status === "todo").length, color: "bg-gray-400" },
                          { label: "In Progress", count: inProgress, color: "bg-amber-500" },
                          { label: "Review", count: tasks.filter((t) => t.status === "review").length, color: "bg-[#5f7d56]" },
                          { label: "Done", count: completed, color: "bg-emerald-500" },
                          { label: "Cancelled", count: tasks.filter((t) => t.status === "cancelled").length, color: "bg-red-500" },
                          { label: "Overdue", count: overdue, color: "bg-red-600" },
                        ].map((s) => (
                          <div key={s.label} className="flex items-center gap-3">
                            <div className={`size-3 rounded-full ${s.color}`} />
                            <span className="text-sm flex-1">{s.label}</span>
                            <span className="text-sm font-bold">{s.count}</span>
                            <div className="w-24 h-2 rounded-full bg-muted">
                              <div className={`h-2 rounded-full ${s.color}`} style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
            );
}
