"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  // Caching defaults: with realtime socket events patching the cache, list
  // queries don't need to refetch on every mount. staleTime keeps a fresh-enough
  // cache for 30s; gcTime holds it for 5m. Any mutation still invalidates as
  // before. This is the difference between a refetch-per-navigation and an
  // instant-from-cache paint.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
