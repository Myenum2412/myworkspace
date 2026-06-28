"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Loader2Icon } from "lucide-react";

type Task = {
  _id: string;
  title: string;
  status: string;
  dueDate?: string;
};



export default function CalendarPage() {
  const { data: session } = useSession();
    const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const orgId = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (orgId) {
          fetch(`/api/tasks?orgId=${orgId}`, { credentials: "include" })
            .then((r) => r.json())
            .then((res) => setTasks((res.data || res || []).filter((t: Task) => t.dueDate)))
            .catch((error) => {
              console.error("[CALENDAR] Failed to fetch tasks:", error);
            })
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("[CALENDAR] Failed to fetch profile:", error);
        setLoading(false);
      });
  }, [session]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeek = tasks.filter((t) => {
    const d = new Date(t.dueDate!);
    return d >= today && d <= new Date(today.getTime() + 7 * 86400000);
  });
  const overdue = tasks.filter((t) => new Date(t.dueDate!) < today && t.status !== "done");
  const later = tasks.filter((t) => new Date(t.dueDate!) > new Date(today.getTime() + 7 * 86400000));

  return (
                                <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-6" />
            <h1 className="text-2xl font-bold">Calendar</h1>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
          ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">Overdue</CardTitle></CardHeader>
              <CardContent>
                {overdue.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : (
                  <div className="space-y-2">{overdue.map((t) => (
                    <div key={t._id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{t.title}</span>
                      <Badge variant="outline" className="text-xs">{new Date(t.dueDate!).toLocaleDateString()}</Badge>
                    </div>
                  ))}</div>
                )}
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-red-400">This Week</CardTitle></CardHeader>
              <CardContent>
                {thisWeek.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : (
                  <div className="space-y-2">{thisWeek.map((t) => (
                    <div key={t._id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{t.title}</span>
                      <Badge variant="outline" className="text-xs">{new Date(t.dueDate!).toLocaleDateString()}</Badge>
                    </div>
                  ))}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Upcoming</CardTitle></CardHeader>
              <CardContent>
                {later.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : (
                  <div className="space-y-2">{later.map((t) => (
                    <div key={t._id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{t.title}</span>
                      <Badge variant="outline" className="text-xs">{new Date(t.dueDate!).toLocaleDateString()}</Badge>
                    </div>
                  ))}</div>
                )}
              </CardContent>
            </Card>
          </div>
          )}
        </main>
            );
}
