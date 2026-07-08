"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { AppInitProvider } from "@/components/app-init-provider";
import { createIndexedDbPersister } from "@/lib/offline/query-persister";
import { onlineManager } from "@tanstack/react-query";

const persister = createIndexedDbPersister();

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            gcTime: 5 * 60_000,
            refetchInterval: 30_000,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 1,
            networkMode: "offlineFirst",
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 7 * 24 * 60 * 60 * 1000,
          buster: "v1",
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
