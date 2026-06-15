"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2Icon, CircleIcon, ArrowUpIcon, Loader2Icon } from "lucide-react";
import { updateTaskStatus } from "@/actions/tasks";
import { useRouter } from "next/navigation";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  createdAt: Date | null;
};

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  cancelled: "Cancelled",
};
const statusColors: Record<string, string> = {
  todo: "bg-gray-500",
  in_progress: "bg-blue-500",
  review: "bg-purple-500",
  done: "bg-emerald-500",
  cancelled: "bg-red-500",
};
const priorityColors: Record<string, string> = {
  urgent: "text-red-500",
  high: "text-amber-500",
  medium: "text-blue-500",
  low: "text-gray-400",
};

function getStatus(s: string | null | undefined): string {
  return s || "todo";
}

function getPriority(p: string | null | undefined): string {
  return p || "medium";
}

export function TaskList({ tasks: initialTasks }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const sorted = [...tasks].sort(
    (a, b) =>
      (priorityOrder[getPriority(a.priority)] ?? 99) -
      (priorityOrder[getPriority(b.priority)] ?? 99)
  );

  async function handleStatusChange(taskId: string, newStatus: string) {
    setLoadingId(taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    await updateTaskStatus(taskId, newStatus);
    setLoadingId(null);
    router.refresh();
  }

  const nextStatus: Record<string, string> = {
    todo: "in_progress",
    in_progress: "review",
    review: "done",
    done: "todo",
    cancelled: "todo",
  };

  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No tasks found</p>
      ) : (
        sorted.map((task) => {
          const status = getStatus(task.status);
          const priority = getPriority(task.priority);
          return (
            <Card key={task.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="flex items-center gap-4 p-4">
                <button
                  onClick={() => handleStatusChange(task.id, nextStatus[status])}
                  disabled={loadingId === task.id}
                  className="shrink-0"
                >
                  {loadingId === task.id ? (
                    <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                  ) : status === "done" ? (
                    <CheckCircle2Icon className="size-5 text-emerald-500" />
                  ) : (
                    <CircleIcon className="size-5 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        status === "done"
                          ? "line-through text-muted-foreground font-medium"
                          : "font-medium"
                      }
                    >
                      {task.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 text-white ${statusColors[status]}`}
                    >
                      {statusLabels[status] || status}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <ArrowUpIcon className={`size-4 ${priorityColors[priority] || "text-gray-400"}`} />
                  <span className="text-xs text-muted-foreground capitalize">{priority}</span>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
