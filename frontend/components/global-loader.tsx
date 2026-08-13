"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { MyWorkspaceLoading } from "@/components/myworkspace-loading";
import { fetchBootstrapData } from "@/lib/api/bootstrap";
import { setDataCache } from "@/lib/api/schemas";
import { useBootstrapStore } from "@/stores/bootstrap-store";

const NAV_ENDPOINTS = ["/api/notifications", "/api/orgmenu", "/api/departments", "/api/employees"];

const RELOAD_FLAG = "mws-session-reload";

function markReloaded() {
  try {
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    /* storage unavailable — rely on the in-memory flag */
  }
}

export function GlobalLoader({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const setBootstrapData = useBootstrapStore((s) => s.setData);
  const setBootstrapLoading = useBootstrapStore((s) => s.setLoading);
  const setHydrated = useBootstrapStore((s) => s.setHydrated);
  const initRef = useRef(false);
  const [sessionStuck, setSessionStuck] = useState(false);

  // Watchdog: the session fetch normally settles in <2s. If it is still in
  // "loading" after a few seconds, the request (or a stale service-worker
  // shell) is hung — force one hard reload to recover. If it is still stuck
  // after that, show a recovery screen instead of a never-ending spinner.
  useEffect(() => {
    if (status !== "loading") {
      setSessionStuck(false);
      return;
    }

    let reloaded = false;
    try {
      reloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
    } catch {
      /* storage unavailable */
    }

    const reloadTimer = window.setTimeout(() => {
      if (!reloaded) {
        markReloaded();
        window.location.reload();
      }
    }, 15000);

    const stuckTimer = window.setTimeout(() => {
      if (reloaded) {
        setSessionStuck(true);
      }
    }, 30000);

    return () => {
      window.clearTimeout(reloadTimer);
      window.clearTimeout(stuckTimer);
    };
  }, [status]);

  // Recovery screen auto-retries: clear the reload flag and reload the page
  // after a short countdown so users don't dead-end on the error screen.
  useEffect(() => {
    if (!sessionStuck) return;
    const retryTimer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        /* storage unavailable */
      }
      window.location.reload();
    }, 8000);
    return () => window.clearTimeout(retryTimer);
  }, [sessionStuck]);

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
    if (sessionStuck) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center text-foreground">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            The workspace is taking too long to load. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem(RELOAD_FLAG);
              } catch {
                /* storage unavailable */
              }
              window.location.reload();
            }}
            className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reload
          </button>
          <p className="text-xs text-muted-foreground">Retrying automatically…</p>
        </div>
      );
    }
    return <MyWorkspaceLoading text="" message="Loading workspace..." />;
  }

  return <>{children}</>;
}
