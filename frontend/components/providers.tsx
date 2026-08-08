"use client";

import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { memo, useEffect, useState } from "react";
import { AppInitProvider } from "@/components/app-init-provider";
import { IndustryProvider } from "@/components/industry-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createIndexedDbPersister } from "@/lib/offline/query-persister";

let persister: ReturnType<typeof createIndexedDbPersister> | null = null;
function getPersister() {
  if (!persister && typeof window !== "undefined") {
    persister = createIndexedDbPersister();
  }
  return persister;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
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
  });
}

const onlineManagerInitialized = { current: false };

const OnlineStatusManager = memo(function OnlineStatusManager({
  queryClient,
}: {
  queryClient: QueryClient;
}) {
  useEffect(() => {
    if (onlineManagerInitialized.current) return;
    onlineManagerInitialized.current = true;

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

  return null;
});

const onPersistSuccess = (queryClient: QueryClient) => () => {
  queryClient.resumePausedMutations();
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <SessionProvider refetchInterval={300} refetchOnWindowFocus={false}>
      <OnlineStatusManager queryClient={queryClient} />
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: getPersister()!,
          maxAge: 7 * 24 * 60 * 60 * 1000,
          buster: "v2",
        }}
        onSuccess={onPersistSuccess(queryClient)}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AppInitProvider>
              <IndustryProvider>{children}</IndustryProvider>
            </AppInitProvider>
          </TooltipProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </SessionProvider>
  );
}
