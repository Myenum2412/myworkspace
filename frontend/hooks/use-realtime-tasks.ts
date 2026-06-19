"use client";

import { useEffect, useState } from "react";
import { getWsClient } from "@/lib/ws/client";
import { WsEventPayload } from "@/lib/ws/events";

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  creatorId: string;
  orgId: string;
  teamId?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export function useRealtimeTasks(orgId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const client = getWsClient();

    const unsubCreated = client.on("task:created", (data) => {
      const task = data.payload as unknown as Task;
      setTasks((prev) => [task, ...prev]);
    });

    const unsubUpdated = client.on("task:updated", (data) => {
      const update = data.payload as WsEventPayload["task:updated"];
      setTasks((prev) =>
        prev.map((t) => (t.id === update.id ? { ...t, ...update } : t))
      );
    });

    const unsubDeleted = client.on("task:deleted", (data) => {
      const { id } = data.payload as WsEventPayload["task:deleted"];
      setTasks((prev) => prev.filter((t) => t.id !== id));
    });

    fetchTasks(orgId).then((data) => {
      setTasks(data as Task[]);
      setLoading(false);
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [orgId]);

  return { tasks, loading, setTasks };
}

async function fetchTasks(orgId: string) {
  try {
    const res = await fetch(`/api/tasks?orgId=${orgId}`, { credentials: "include" });
    if (res.ok) {
      const d = await res.json();
      return d.data || d;
    }
  } catch { /* ignore */ }
  return [];
}
