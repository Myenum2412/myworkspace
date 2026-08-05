"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListTodoIcon, ChevronLeft, ChevronRight } from "@/lib/icons";
import { useIndustry } from "@/components/industry-provider";

export default function StaffUpcomingTasksPage() {
  const { t } = useIndustry();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/staffs/upcoming-tasks")
      .then(r => r.json())
      .then(d => { if (!cancelled) setTasks(d.tasks || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status]);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(30);

  const paginated = useMemo(() => {
    const start = page * pageSize;
    return tasks.slice(start, start + pageSize);
  }, [tasks, page, pageSize]);

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
    setPage(0);
  }, []);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <div className="flex items-center gap-2">
        <ListTodoIcon className="size-6" />
        <h1 className="text-2xl font-bold tracking-tight">{t("page.staffs.upcomingTasks")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ListTodoIcon className="size-4" />
            {t("page.staffs.upcomingTasks")} ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
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
                      {t("common.noResults")}
                    </td>
                  </tr>
                ) : (
                  paginated.map((task, index) => (
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
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            <span className="text-sm text-muted-foreground">
              {tasks.length === 0
                ? "0 items"
                : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, tasks.length)} of ${tasks.length}`}
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="90">90</SelectItem>
                    <SelectItem value="120">120</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * pageSize >= tasks.length}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
