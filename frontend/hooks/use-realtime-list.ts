"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { getSocketIO } from "@/lib/socketio-client";
import { perfLog, perfNow } from "@/lib/perf";

/**
 * Generic live list: React Query for the initial/background fetch + Socket.IO
 * delta patches for instant cross-client updates.
 *
 * @param queryKey  React Query key (must be stable).
 * @param fetcher  Returns the full list from the API.
 * @param socketEvents  { created, updated, deleted } event names. `updated`
 *   carries the merge fn that maps a patch onto an existing item.
 * @param opts  forwarded to useQuery (staleTime etc.).
 */
export function useRealtimeList<T extends { id: string }>(
  queryKey: readonly unknown[],
  fetcher: () => Promise<T[]>,
  socketEvents: {
    created?: string;
    updated?: string;
    deleted?: string;
    /** Merge an incoming patch (_payload) onto an existing list item. */
    mergeOnUpdate?: (existing: T, patch: any) => T;
    /** Guard: should this event apply to the current list scope? */
    belongs?: (payload: any) => boolean;
  },
  opts?: Omit<UseQueryOptions<T[], unknown, T[], typeof queryKey>, "queryKey" | "queryFn">,
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey,
    queryFn: fetcher,
    ...opts,
  });

  useEffect(() => {
    const t0 = perfNow();
    const socket = getSocketIO();
    const handlers: Array<[string, (d: any) => void]> = [];

    if (socketEvents.created) {
      const h = (data: any) => {
        const item = (data?.payload ?? data) as T;
        if (socketEvents.belongs && !socketEvents.belongs(item)) return;
        queryClient.setQueryData(queryKey, (prev: T[] | undefined) => {
          if (!prev || prev.some((p) => p.id === item.id)) return prev;
          return [item, ...prev];
        });
        perfLog("list.patch.created", perfNow() - t0, { event: socketEvents.created });
      };
      socket.on(socketEvents.created, h);
      handlers.push([socketEvents.created, h]);
    }

    if (socketEvents.updated) {
      const h = (data: any) => {
        const patch = (data?.payload ?? data) as any;
        if (socketEvents.belongs && !socketEvents.belongs(patch)) return;
        const merge = socketEvents.mergeOnUpdate ?? ((e, p) => ({ ...e, ...p }));
        queryClient.setQueryData(queryKey, (prev: T[] | undefined) =>
          prev?.map((e) => (e.id === patch.id ? merge(e, patch) : e)) ?? prev,
        );
      };
      socket.on(socketEvents.updated, h);
      handlers.push([socketEvents.updated, h]);
    }

    if (socketEvents.deleted) {
      const h = (data: any) => {
        const { id } = (data?.payload ?? data) as { id: string };
        queryClient.setQueryData(queryKey, (prev: T[] | undefined) =>
          prev?.filter((e) => e.id !== id) ?? prev,
        );
      };
      socket.on(socketEvents.deleted, h);
      handlers.push([socketEvents.deleted, h]);
    }

    return () => {
      for (const [evt, h] of handlers) socket.off(evt, h);
    };
  }, [queryClient, queryKey, socketEvents.created, socketEvents.updated, socketEvents.deleted, socketEvents.belongs, socketEvents.mergeOnUpdate]);

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    set: (updater: T[] | ((p: T[]) => T[])) => queryClient.setQueryData(queryKey, updater as any),
  };
}
