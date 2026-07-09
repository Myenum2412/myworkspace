"use client";

import { useState, useEffect, useRef } from "react";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
  focusManager,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { AppInitProvider } from "@/components/app-init-provider";
import { createIndexedDbPersister } from "@/lib/offline/query-persister";

const persister = createIndexedDbPersister();

const STALE_TIMES = {
  dashboard: 30_000,
  tasks: 15_000,
  projects: 30_000,
  teams: 30_000,
  employees: 30_000,
  files: 60_000,
  notifications: 10_000,
  user: 5 * 60_000,
  settings: 5 * 60_000,
  search: 0,
  chat: 5_000,
  org: 2 * 60_000,
  billing: 2 * 60_000,
  activity: 30_000,
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_TIMES.dashboard,
            gcTime: 30 * 60_000,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
            networkMode: "offlineFirst",
            refetchInterval: false,
          },
          mutations: {
            retry: 1,
            networkMode: "offlineFirst",
          },
        },
      }),
  );

  useEffect(() => {
    onlineManager.setEventListener((setOnline) => {
      const handleOnline = () => {
        setOnline(true);
        queryClient.resumePausedMutations();
      };
      const handleOffline = () => setOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    });

    focusManager.setEventListener((handleFocus: (focused?: boolean) => void) => {
      const handler = () => handleFocus(true);
      window.addEventListener("focus", handler);
      return () => window.removeEventListener("focus", handler);
    });
  }, [queryClient]);

  return (
    <SessionProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 7 * 24 * 60 * 60 * 1000,
          buster: "v2",
        }}
        onSuccess={() => {
          queryClient.resumePausedMutations();
        }}
      >
        <TooltipProvider>
          <AppInitProvider>
            {children}
          </AppInitProvider>
        </TooltipProvider>
      </PersistQueryClientProvider>
    </SessionProvider>
  );
}