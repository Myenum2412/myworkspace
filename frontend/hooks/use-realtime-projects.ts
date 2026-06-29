"use client";

import { useRealtimeList } from "./use-realtime-list";

export type Project = {
  id: string;
  name: string;
  description?: string;
  client?: string;
  color?: string;
  status?: string;
  access?: string;
  deadline?: string | null;
  progress?: number;
  tracked?: number;
  orgId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function useRealtimeProjects(orgId?: string) {
  return useRealtimeList<Project>(
    orgId ? ["projects", orgId] : ["projects"],
    async () => {
      if (!orgId) return [];
      try {
        const r = await fetch(`/api/projects?orgId=${orgId}`, { credentials: "include" });
        if (!r.ok) return [];
        const d = await r.json();
        return d.data || [];
      } catch {
        return [];
      }
    },
    {
      created: "project:created",
      updated: "project:updated",
      deleted: "project:deleted",
      belongs: (p) => !orgId || p.orgId === orgId,
      mergeOnUpdate: (e, p) => ({ ...e, ...p }),
    },
    { enabled: !!orgId },
  );
}
