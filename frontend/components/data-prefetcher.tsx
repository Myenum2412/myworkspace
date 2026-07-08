"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

interface PrefetchConfig {
  queryKey: string[];
  url: string;
  staleTime?: number;
}

export function DataPrefetcher({ queries }: { queries: PrefetchConfig[] }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    for (const { queryKey, url, staleTime } of queries) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn: () => fetch(url).then(res => res.json()),
        staleTime: staleTime ?? 60_000,
      });
    }
  }, [queryClient, queries]);

  return null;
}
