"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, ListTodoIcon, SearchIcon, AlertCircleIcon, ChevronUpIcon, ChevronDownIcon, CrownIcon, UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TaskDetailedView } from "@/components/task-detailed-view";
import type { Task } from "./columns";
import Stats07 from "@/components/stats-07";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";

export interface OverviewInteractiveProps {
  tasks: Task[];
  currentUserId: string;
}

export default function OverviewInteractive({ tasks: initialTasks, currentUserId }: OverviewInteractiveProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [viewOpen, setViewOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const total = tasks.length;
  const myTasks = currentUserId ? tasks.filter((t) => t.assigneeId === currentUserId).length : 0;
  const teamTasks = total - myTasks;
  const savedCount = tasks.filter((t) => t.isSaved).length;
  const upcomingCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done" || t.status === "cancelled") return false;
    return new Date(t.dueDate) >= new Date();
  }).length;
  const completedCount = tasks.filter((t) => t.status === "done").length;
  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // Overdue tasks
  const overdueTasks = useMemo(() =>
    tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done" && t.status !== "cancelled")
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()),
    [tasks]
  );

  // Employee leaderboard (ranked by completed tasks)
  const leaderboard = useMemo(() => {
    const counts = new Map<string, { name: string; avatar: string; completed: number }>();
    for (const t of tasks) {
      if (t.status === "done" && t.assigneeId) {
        const existing = counts.get(t.assigneeId) || { name: t.assigneeName || "Unknown", avatar: t.assigneeAvatar || "", completed: 0 };
        existing.completed++;
        counts.set(t.assigneeId, existing);
      }
    }
    return [...counts.entries()]
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.completed - a.completed);
  }, [tasks]);

  type LeaderboardEntry = { id: string; name: string; avatar: string; completed: number };

  const leaderboardColumns: ColumnDef<LeaderboardEntry>[] = [
    {
      id: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarImage src={row.original.avatar} alt={row.original.name} />
            <AvatarFallback className="text-[10px]">
              {row.original.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: "completed",
      header: "Completed",
      cell: ({ row }) => <span className="font-semibold">{row.original.completed}</span>,
    },
    {
      id: "rank",
      header: "Rank",
      cell: ({ row }) => {
        const index = row.index;
        if (index === 0) return <span className="text-[10px] font-semibold text-yellow-600">1st</span>;
        if (index === 1) return <span className="text-[10px] font-semibold text-gray-500">2nd</span>;
        if (index === 2) return <span className="text-[10px] font-semibold text-amber-700">3rd</span>;
        return <span className="text-[10px] font-semibold text-muted-foreground">#{index + 1}</span>;
      },
    },
  ];

  const filteredOverdue = searchQuery
    ? overdueTasks.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.assigneeName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : overdueTasks;

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListTodoIcon className="size-5 sm:size-6" />
            <h1 className="text-xl sm:text-2xl font-bold">Task Overview</h1>
          </div>
          <div className="flex-1 flex justify-center max-w-md mx-4">
            <div className="relative w-full">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search overdue tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
            </div>
          </div>
          <Button onClick={() => router.push('/createtask')} className="touch-target">
            <PlusIcon className="mr-2 size-4" />
            New Task
          </Button>
        </div>

        <Stats07
          items={[
            { name: 'Total Tasks', value: total, subtitle: 'All tasks' },
            { name: 'My Tasks', value: myTasks, subtitle: 'Assigned to you' },
            { name: 'Team Tasks', value: teamTasks, subtitle: 'Assigned to others' },
            { name: 'Saved', value: savedCount, subtitle: 'Bookmarked tasks' },
            { name: 'Upcoming', value: upcomingCount, subtitle: 'Pending due dates' },
            { name: 'Completion', value: completionRate, subtitle: '% completed' },
          ]}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Overdue Tasks */}
          <Card className="flex flex-col min-h-0 border-0 shadow-none">
            <CardHeader className="pb-3 shrink-0 px-0">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircleIcon className="size-4 text-red-500" />
                Overdue Tasks
                <Badge variant="destructive" className="ml-1 text-xs">{overdueTasks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <div className="grid grid-cols-[40px_1fr_1fr_80px] gap-2 px-0 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
              <span></span>
              <span>Task</span>
              <span>Assignee</span>
              <span className="text-right">Overdue</span>
            </div>
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-0 space-y-1">
              {filteredOverdue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertCircleIcon className="size-8 mb-2 text-muted-foreground/30" />
                  <p className="text-sm">No overdue tasks</p>
                </div>
              ) : filteredOverdue.map((t) => (
                <div
                  key={t._id}
                  className="grid grid-cols-[40px_1fr_1fr_80px] gap-2 items-center p-2.5 border cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => { setSelectedTask(t); setViewOpen(true); }}
                >
                  <div className="flex items-center justify-center size-8 bg-red-50 shrink-0">
                    <AlertCircleIcon className="size-4 text-red-500" />
                  </div>
                  <span className="text-sm font-medium truncate">{t.title}</span>
                  <span className="text-sm truncate">{t.assigneeName || "Unassigned"}</span>
                  <span className="text-xs text-red-500 font-semibold text-right shrink-0">
                    {t.dueDate ? `${Math.ceil((new Date().getTime() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24))}d` : "—"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Employee Leaderboard */}
          <Card className="flex flex-col min-h-0 border-0 shadow-none">
            <CardHeader className="pb-3 shrink-0 px-0">
              <CardTitle className="text-base flex items-center gap-2">
                <CrownIcon className="size-4 text-yellow-500" />
                Employee Leaderboard
                <span className="text-xs font-normal text-muted-foreground ml-1">by completed tasks</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <DataTable
                columns={leaderboardColumns}
                data={leaderboard}
                hideSearchBar
                label="employee(s)"
                emptyMessage="No completed tasks yet"
                emptyIcon={<UserIcon className="size-6 text-muted-foreground/50" />}
                showCheckboxes={false}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      {viewOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-[95vw] h-[95vh] bg-card shadow-xl overflow-hidden flex flex-col">
            <TaskDetailedView
              task={selectedTask}
              editable
              onTaskUpdate={(updated) => {
                setTasks((prev) => prev.map((t) => t._id === updated._id ? updated : t));
              }}
              onClose={() => { setViewOpen(false); setEditMode(false); setSelectedTask(null); }}
            />
          </div>
        </div>
      )}
    </>
  );
}
