"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { fetchBootstrapData } from "@/lib/api/bootstrap";
import { setDataCache } from "@/lib/api/schemas";
import { useBootstrapStore } from "@/stores/bootstrap-store";

const NAV_ENDPOINTS = ["/api/notifications", "/api/orgmenu", "/api/departments", "/api/employees"];

export function GlobalLoader({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const setBootstrapData = useBootstrapStore((s) => s.setData);
  const setBootstrapLoading = useBootstrapStore((s) => s.setLoading);
  const setHydrated = useBootstrapStore((s) => s.setHydrated);
  const initRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || initRef.current) return;
    initRef.current = true;

    setBootstrapLoading(true);

    let completed = false;

    fetchBootstrapData()
      .then((bootstrapData) => {
        setBootstrapData(bootstrapData);
        return Promise.allSettled(
          NAV_ENDPOINTS.map((endpoint) =>
            fetch(endpoint, { credentials: "include" })
              .then((res) => (res.ok ? res.json() : null))
              .catch(() => null),
          ),
        );
      })
      .then((results) => {
        const cache: Record<string, { data: unknown }> = {};
        for (let i = 0; i < NAV_ENDPOINTS.length; i++) {
          const r = results[i];
          if (r?.status === "fulfilled" && r.value) {
            cache[NAV_ENDPOINTS[i]] = { data: r.value.data ?? r.value };
          }
        }
        setDataCache(cache);
      })
      .finally(() => {
        completed = true;
        setBootstrapLoading(false);
        setHydrated(true);
      });

    setTimeout(() => {
      if (!completed) {
        setBootstrapLoading(false);
        setHydrated(true);
      }
    }, 2000);
  }, [status, setBootstrapData, setBootstrapLoading, setHydrated]);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
        <div className="size-10 animate-spin rounded-full border-[3px] border-current border-t-transparent text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading workspace...</p>
      </div>
    );
  }

  return <>{children}</>;
}
