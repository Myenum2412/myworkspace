"use client";

import { useRealtimeList } from "./use-realtime-list";

export type Team = {
  id: string;
  name: string;
  description?: string;
  orgId?: string;
  memberCount?: number;
  createdAt?: string;
};

export function useRealtimeTeams(orgId?: string) {
  return useRealtimeList<Team>(
    orgId ? ["teams", orgId] : ["teams"],
    async () => {
      if (!orgId) return [];
      try {
        const r = await fetch(`/api/teams?orgId=${orgId}`, { credentials: "include" });
        if (!r.ok) return [];
        const d = await r.json();
        return d.data || [];
      } catch {
        return [];
      }
    },
    {
      created: "team:created",
      deleted: "team:deleted",
      belongs: (p) => !orgId || p.orgId === orgId,
      mergeOnUpdate: (e, p) => ({ ...e, ...p }),
    },
    { enabled: !!orgId },
  );
}
