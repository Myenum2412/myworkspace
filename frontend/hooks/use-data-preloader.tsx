"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useBootstrapStore } from "@/stores/bootstrap-store";

const CRITICAL_QUERIES = [
  { queryKey: ["dashboard", "metrics"], url: "/api/dashboard/metrics" },
  { queryKey: ["notifications", "unread"], url: "/api/notifications?limit=1&unread=true" },
];

export function DataPreloader({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const bootstrap = useBootstrapStore((s) => s.data);
  const prefetched = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || prefetched.current) return;
    prefetched.current = true;

    for (const { queryKey, url } of CRITICAL_QUERIES) {
      const existing = queryClient.getQueryData(queryKey);
      if (!existing) {
        queryClient.prefetchQuery({
          queryKey,
          queryFn: async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000);
            try {
              const res = await fetch(url, { credentials: "include", signal: controller.signal });
              if (!res.ok) throw new Error(`Prefetch failed: ${res.status}`);
              const json = await res.json();
              return json.data ?? json;
            } finally {
              clearTimeout(timer);
            }
          },
          staleTime: 60_000,
        });
      }
    }
  }, [status, queryClient, bootstrap?.orgId]);

  return <>{children}</>;
}
