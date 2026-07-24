"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { BarChart3Icon, SearchIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Task = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
};

type ReportsClientProps = {
  tasks: Task[];
};

export default function ReportsClient({ tasks }: ReportsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q) ||
        t.priority.toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  const total = filteredTasks.length;
  const completed = filteredTasks.filter((t) => t.status === "done").length;
  const inProgress = filteredTasks.filter((t) => t.status === "in_progress").length;
  const overdue = filteredTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done" && t.status !== "cancelled").length;

  const priorityBreakdown = [
    { label: "Urgent", count: filteredTasks.filter((t) => t.priority === "urgent").length, color: "bg-red-500" },
    { label: "High", count: filteredTasks.filter((t) => t.priority === "high").length, color: "bg-red-500" },
    { label: "Medium", count: filteredTasks.filter((t) => t.priority === "medium").length, color: "bg-red-500" },
    { label: "Low", count: filteredTasks.filter((t) => t.priority === "low").length, color: "bg-gray-400" },
  ];

  return (
    <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <BarChart3Icon className="size-6" />
          <h1 className="text-xl sm:text-2xl font-bold">Reports</h1>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white"
            />
          </div>
        </div>
        <div className="shrink-0 w-[140px]" />
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
                    <div className="w-24 h-2 rounded-sm bg-muted">
                      <div className={`h-2 rounded-sm ${p.color}`} style={{ width: `${total > 0 ? (p.count / total) * 100 : 0}%` }} />
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
                  { label: "To Do", count: filteredTasks.filter((t) => t.status === "todo").length, color: "bg-gray-400" },
                  { label: "In Progress", count: inProgress, color: "bg-red-500" },
                  { label: "Review", count: filteredTasks.filter((t) => t.status === "review").length, color: "bg-gray-1000" },
                  { label: "Done", count: completed, color: "bg-red-500" },
                  { label: "Cancelled", count: filteredTasks.filter((t) => t.status === "cancelled").length, color: "bg-red-500" },
                  { label: "Overdue", count: overdue, color: "bg-red-500" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className={`size-3 rounded-full ${s.color}`} />
                    <span className="text-sm flex-1">{s.label}</span>
                    <span className="text-sm font-bold">{s.count}</span>
                    <div className="w-24 h-2 rounded-sm bg-muted">
                      <div className={`h-2 rounded-sm ${s.color}`} style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }} />
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
