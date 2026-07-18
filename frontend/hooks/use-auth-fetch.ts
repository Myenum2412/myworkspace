"use client";

import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, type ApiClientOptions } from "@/lib/api/client";

export function useAuthFetch() {
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const fetchWithAuth = useCallback(async <T>(
    url: string,
    options?: ApiClientOptions,
  ): Promise<T> => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      return await api.get<T>(url, {
        ...options,
        signal: options?.signal ?? abortRef.current.signal,
        dedupKey: options?.dedupKey ?? url,
      });
    } finally {
      abortRef.current = null;
    }
  }, []);

  const prefetchQuery = useCallback((
    queryKey: string[],
    url: string,
    staleTime = 60000,
  ) => {
    const existing = queryClient.getQueryData(queryKey);
    if (!existing) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn: () => api.get(url, { dedupKey: queryKey.join(":"), timeout: 10000 }),
        staleTime,
      });
    }
  }, [queryClient]);

  const invalidateQueries = useCallback((queryKeys: string[][]) => {
    for (const key of queryKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  }, [queryClient]);

  return { fetchWithAuth, prefetchQuery, invalidateQueries };
}
