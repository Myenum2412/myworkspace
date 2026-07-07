import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3Icon, TrendingUpIcon, CheckCircle2Icon } from "lucide-react";

export const dynamic = "force-dynamic";

type Task = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
};

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let tasks: Task[] = [];
  if (orgId) {
    const raw = await db.collection(collections.tasks).find({ orgId }).toArray();
    tasks = (raw as unknown as Record<string, unknown>[]).map((t) => ({
      _id: (t._id as { toString: () => string }).toString(),
      title: (t.title as string) || "",
      status: (t.status as string) || "",
      priority: (t.priority as string) || "",
      dueDate: (t.dueDate as string) || undefined,
      createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
    }));
  }

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done" && t.status !== "cancelled").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const priorityBreakdown = [
    { label: "Urgent", count: tasks.filter((t) => t.priority === "urgent").length, color: "bg-red-500" },
    { label: "High", count: tasks.filter((t) => t.priority === "high").length, color: "bg-red-500" },
    { label: "Medium", count: tasks.filter((t) => t.priority === "medium").length, color: "bg-red-500" },
    { label: "Low", count: tasks.filter((t) => t.priority === "low").length, color: "bg-gray-400" },
  ];

  return (
    <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      <div className="flex items-center gap-2">
        <BarChart3Icon className="size-6 shrink-0" />
        <h1 className="text-xl sm:text-2xl font-bold">Reports</h1>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3Icon className="size-4" /> Total Tasks</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2Icon className="size-4" /> Completed</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-500">{completed}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-400">{inProgress}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUpIcon className="size-4" /> Completion Rate</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{completionRate}%</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
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
                  { label: "In Progress", count: inProgress, color: "bg-red-500" },
                  { label: "Review", count: tasks.filter((t) => t.status === "review").length, color: "bg-gray-1000" },
                  { label: "Done", count: completed, color: "bg-red-500" },
                  { label: "Cancelled", count: tasks.filter((t) => t.status === "cancelled").length, color: "bg-red-500" },
                  { label: "Overdue", count: overdue, color: "bg-red-500" },
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
    </main>
  );
}
