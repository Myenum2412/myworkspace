"use client";

import { useRealtimeList } from "./use-realtime-list";

export type Client = {
  id: string;
  name: string;
  email?: string;
  orgId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function useRealtimeClients(orgId?: string) {
  return useRealtimeList<Client>(
    orgId ? ["clients", orgId] : ["clients"],
    async () => {
      if (!orgId) return [];
      try {
        const r = await fetch(`/api/clients?orgId=${orgId}`, { credentials: "include" });
        if (!r.ok) return [];
        const d = await r.json();
        return d.data || [];
      } catch {
        return [];
      }
    },
    {
      created: "client:created",
      updated: "client:updated",
      deleted: "client:deleted",
      belongs: (p) => !orgId || p.orgId === orgId,
      mergeOnUpdate: (e, p) => ({ ...e, ...p }),
    },
    { enabled: !!orgId },
  );
}
