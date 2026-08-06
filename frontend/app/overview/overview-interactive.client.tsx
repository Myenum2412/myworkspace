"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, SearchIcon, AlertCircleIcon, CrownIcon, UserIcon, ListChecksIcon } from "@/lib/icons";
import { PageHeader } from "@/components/page-header";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TaskDetailedView } from "@/components/task-detailed-view";
import { createColumns } from "./columns.client";
import type { Task } from "./columns.client";
import Stats07 from "@/components/stats-07";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { employeeService } from "@/lib/services/employee-service";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

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
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    employeeService.getAllEmployees().then((res) => {
      setEmployees((res as any[]).map((e: any) => ({ id: e.id, name: e.name || "Unknown" })));
    }).catch(() => {});
  }, []);

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
    const completedCounts = new Map<string, { name: string; avatar: string; completed: number }>();
    for (const t of tasks) {
      if (t.status === "done" && t.assigneeId) {
        const existing = completedCounts.get(t.assigneeId) || { name: t.assigneeName || "Unknown", avatar: t.assigneeAvatar || "", completed: 0 };
        existing.completed++;
        completedCounts.set(t.assigneeId, existing);
      }
    }
    const allEntries = employees.length > 0
      ? employees.map((e) => {
          const c = completedCounts.get(e.id);
          return { id: e.id, name: e.name, avatar: c?.avatar || "", completed: c?.completed || 0 };
        })
      : [...completedCounts.entries()].map(([id, data]) => ({ id, ...data }));
    return allEntries.sort((a, b) => b.completed - a.completed);
  }, [tasks, employees]);

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

  const handleDelete = useCallback(async (task: Task) => {
    try {
      const res = await apiFetch(`/api/tasks/${task._id}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t._id !== task._id));
        toast.success("Task deleted successfully");
      } else {
        toast.error("Failed to delete task");
      }
    } catch {
      toast.error("Could not connect to server");
    }
  }, []);

  const overdueColumns = useMemo(
    () => createColumns({
      onView: (task) => { setSelectedTask(task); setViewOpen(true); },
      onEdit: (task) => { setSelectedTask(task); setViewOpen(true); setEditMode(true); },
      onDelete: handleDelete,
    }),
    [handleDelete]
  );

  const filteredOverdue = searchQuery
    ? overdueTasks.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.assigneeName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : overdueTasks;

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <PageHeader
          icon={<ListChecksIcon className="size-6" />}
          title="Task Overview"
          search={
            <div className="relative w-full">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search overdue tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
            </div>
          }
          actions={
            <Button onClick={() => router.push('/createtask')} className="touch-target">
              <PlusIcon className="mr-2 size-4" />
              New Task
            </Button>
          }
        />

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
          <div className="flex flex-col min-h-0">
            <div className="pb-3 shrink-0">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <AlertCircleIcon className="size-4 text-red-500" />
                Overdue Tasks
                <Badge variant="destructive" className="ml-1 text-xs">{overdueTasks.length}</Badge>
              </h3>
            </div>
            <div className="flex-1 min-h-0">
              <DataTable
                columns={overdueColumns}
                data={filteredOverdue}
                hideSearchBar
                hidePageSizeSelector
                pageSize={6}
                label="overdue task(s)"
                emptyMessage="No overdue tasks"
                emptyIcon={<AlertCircleIcon className="size-6 text-muted-foreground/50" />}
                showCheckboxes
                onRowClick={(task) => { setSelectedTask(task); setViewOpen(true); }}
              />
            </div>
          </div>

          {/* Employee Leaderboard */}
          <div className="flex flex-col min-h-0">
            <div className="pb-3 shrink-0">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <CrownIcon className="size-4 text-yellow-500" />
                Employee Leaderboard
                <span className="text-xs font-normal text-muted-foreground ml-1">by completed tasks</span>
              </h3>
            </div>
            <div className="flex-1 min-h-0">
              <DataTable
                columns={leaderboardColumns}
                data={leaderboard}
                hideSearchBar
                hidePageSizeSelector
                pageSize={6}
                label="employee(s)"
                emptyMessage="No completed tasks yet"
                emptyIcon={<UserIcon className="size-6 text-muted-foreground/50" />}
                showCheckboxes
              />
            </div>
          </div>
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
