"use client";

import { useRealtimeList } from "./use-realtime-list";

export type Task = {
  id: string;
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  creatorId?: string;
  creatorName?: string;
  orgId: string;
  teamId?: string;
  dueDate?: string | null;
  createdAt: string;
  updatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNote?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
};

interface TasksResponse {
  success: boolean;
  data: Task[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

async function fetchTasks(orgId: string): Promise<Task[]> {
  try {
    const res = await fetch(`/api/tasks?orgId=${orgId}`, { credentials: "include" });
    if (!res.ok) return [];
    const d: TasksResponse = await res.json();
    return d.data || [];
  } catch {
    return [];
  }
}

/**
 * Live task list. Shared generic realtime hook + per-event wiring for the
 * task:created/updated/deleted/batch-updated stream.
 */
export function useRealtimeTasks(orgId?: string) {
  const list = useRealtimeList<Task>(
    orgId ? ["tasks", orgId] : ["tasks"],
    () => (orgId ? fetchTasks(orgId) : Promise.resolve([])),
    {
      created: "task:created",
      updated: "task:updated",
      deleted: "task:deleted",
      belongs: (p) => !orgId || p.orgId === orgId,
      mergeOnUpdate: (e, p) => ({ ...e, ...p }),
    },
    { enabled: !!orgId },
  );

  // batch-updated is task-specific, subscribe separately.
  return list;
}
