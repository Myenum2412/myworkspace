"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useBootstrapStore } from "@/stores/bootstrap-store";
import { fetchBootstrapData, getCachedBootstrap, invalidateBootstrapCache } from "@/lib/api/bootstrap";
import { isAppPage } from "@/lib/app-context";

export function useAppBootstrap() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { data, isLoading, isHydrated, error, setData, setLoading, setError, setHydrated } = useBootstrapStore();
  const initRef = useRef(false);
  const isApp = isAppPage(pathname);

  useEffect(() => {
    if (!isApp || status !== "authenticated" || initRef.current) return;
    initRef.current = true;

    const cached = getCachedBootstrap();
    if (cached) {
      setData(cached);
      setHydrated(true);
      return;
    }

    setLoading(true);

    fetchBootstrapData()
      .then((data) => {
        setData(data);
        setHydrated(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setHydrated(true);
      });
  }, [status, isApp, setData, setLoading, setError, setHydrated]);

  useEffect(() => {
    if (status === "unauthenticated") {
      initRef.current = false;
      invalidateBootstrapCache();
    }
  }, [status]);

  return {
    bootstrap: data,
    isLoading: isLoading && !isHydrated,
    isHydrated,
    error,
    session,
    sessionStatus: status,
  };
}
