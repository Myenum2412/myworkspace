"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

const ROUTE_QUERY_MAP: Record<string, { queryKey: string[]; url: string }[]> = {
  "/dashboard": [
    { queryKey: ["dashboard", "metrics"], url: "/api/dashboard/metrics" },
  ],
  "/employees": [
    { queryKey: ["employees"], url: "/api/users?page=1&limit=20" },
  ],
  "/projects": [
    { queryKey: ["projects"], url: "/api/projects?page=1&limit=20" },
  ],
  "/clients": [
    { queryKey: ["clients"], url: "/api/clients?page=1&limit=20" },
  ],
  "/tasks": [
    { queryKey: ["tasks"], url: "/api/tasks?page=1&limit=20" },
  ],
  "/files": [
    { queryKey: ["files"], url: "/api/files?page=1&limit=20" },
  ],
  "/notifications": [
    { queryKey: ["notifications"], url: "/api/notifications?page=1&limit=20" },
  ],
  "/approvals": [
    { queryKey: ["approvals"], url: "/api/file-approval?page=1&limit=20" },
  ],
};

export function useRoutePrefetcher() {
  const queryClient = useQueryClient();

  const prefetchRoute = useCallback((route: string) => {
    const queries = ROUTE_QUERY_MAP[route];
    if (!queries) return;

    for (const { queryKey, url } of queries) {
      const existing = queryClient.getQueryData(queryKey);
      if (!existing) {
        queryClient.prefetchQuery({
          queryKey,
          queryFn: async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            try {
              const res = await fetch(url, { credentials: "include", signal: controller.signal });
              if (!res.ok) return null;
              const json = await res.json();
              return json.data ?? json;
            } finally {
              clearTimeout(timer);
            }
          },
          staleTime: 30000,
        });
      }
    }
  }, [queryClient]);

  const getRouteData = useCallback((route: string) => {
    const queries = ROUTE_QUERY_MAP[route];
    if (!queries) return null;
    const results: Record<string, unknown> = {};
    for (const { queryKey, url } of queries) {
      results[url] = queryClient.getQueryData(queryKey);
    }
    return results;
  }, [queryClient]);

  return { prefetchRoute, getRouteData };
}
