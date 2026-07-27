"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListTodoIcon } from "lucide-react";

export default function StaffUpcomingTasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); }
  }, [status, router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/staffs/upcoming-tasks")
      .then(r => r.json())
      .then(d => { if (!cancelled) setTasks(d.tasks || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <div className="flex items-center gap-2">
        <ListTodoIcon className="size-6" />
        <h1 className="text-2xl font-bold tracking-tight">Upcoming Tasks</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ListTodoIcon className="size-4" />
            Upcoming Tasks ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-sm">
            <table className="table-premium w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-12">#</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Title</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Priority</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Status</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Assignee</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No upcoming tasks found
                    </td>
                  </tr>
                ) : (
                  tasks.map((task, index) => (
                    <tr key={task._id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{task.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{task.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{task.assignee || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
