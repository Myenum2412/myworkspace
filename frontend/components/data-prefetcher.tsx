"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

interface PrefetchConfig {
  queryKey: string[];
  url: string;
  staleTime?: number;
}

export function DataPrefetcher({ queries }: { queries: PrefetchConfig[] }) {
  const queryClient = useQueryClient();
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;

    for (const { queryKey, url, staleTime } of queries) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8_000);
          try {
            const res = await fetch(url, { signal: controller.signal });
            return res.json();
          } finally {
            clearTimeout(timer);
          }
        },
        staleTime: staleTime ?? 60_000,
      });
    }
  }, [queryClient, queries]);

  return null;
}
