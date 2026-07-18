"use client";

import { useEffect, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useBootstrapStore } from "@/stores/bootstrap-store";
import { fetchBootstrapData, getCachedBootstrap, invalidateBootstrapCache } from "@/lib/api/bootstrap";
import { isAppPage } from "@/lib/app-context";

export function AppInitProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { setData, setLoading, setError, setHydrated } = useBootstrapStore();

  const isApp = isAppPage(pathname);

  useEffect(() => {
    if (!isApp) return;
    if (status !== "authenticated") return;

    const cached = getCachedBootstrap();
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);

    fetchBootstrapData()
      .then((data) => {
        setData(data);
        useBootstrapStore.setState({ isHydrated: true, isLoading: false });
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setHydrated(true);
      });
  }, [session?.user?.id, status, isApp, setData, setLoading, setError, setHydrated]);

  useEffect(() => {
    if (status === "unauthenticated") {
      invalidateBootstrapCache();
      useBootstrapStore.getState().reset();
    }
  }, [status]);

  return <>{children}</>;
}
