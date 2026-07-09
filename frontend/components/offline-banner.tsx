"use client";

import * as React from "react";
import { useConnectivity } from "@/lib/offline/use-connectivity";
import {
  isCurrentlySyncing,
  subscribeSync,
  type SyncEvent,
} from "@/lib/offline/sync-processor";

type BannerState =
  | { kind: "online" }
  | { kind: "offline" }
  | { kind: "syncing"; remaining: number }
  | { kind: "failed"; remaining: number };

function deriveState(
  isOnline: boolean,
  sync: SyncEvent | null,
  queued: number,
): BannerState {
  if (!isOnline) return { kind: "offline" };
  if (sync && sync.status === "syncing" && sync.remaining > 0) {
    return { kind: "syncing", remaining: sync.remaining };
  }
  if (sync && (sync.status === "failed" || sync.status === "partial") && sync.remaining > 0) {
    return { kind: "failed", remaining: sync.remaining };
  }
  if (queued > 0) {
    return { kind: "failed", remaining: queued };
  }
  return { kind: "online" };
}

export function OfflineBanner() {
  const { isOnline } = useConnectivity();
  const [sync, setSync] = React.useState<SyncEvent | null>(null);
  const [queued, setQueued] = React.useState(0);

  React.useEffect(() => {
    const unsub = subscribeSync((e) => {
      setSync(e);
      if (e.status !== "syncing") {
        void (async () => {
          const { getQueueLength } = await import("@/lib/offline/queue");
          setQueued(await getQueueLength());
        })();
      }
    });
    void (async () => {
      const { getQueueLength } = await import("@/lib/offline/queue");
      setQueued(await getQueueLength());
    })();
    return unsub;
  }, []);

  React.useEffect(() => {
    if (!isCurrentlySyncing()) return;
    const id = setInterval(() => {
      void (async () => {
        const { getQueueLength } = await import("@/lib/offline/queue");
        setQueued(await getQueueLength());
      })();
    }, 500);
    return () => clearInterval(id);
  }, [sync?.status]);

  const state = deriveState(isOnline, sync, queued);

  const baseClasses =
    "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300";

  const variants: Record<BannerState["kind"], string> = {
    online: "bg-green-100 text-green-800 border border-green-200",
    offline: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    syncing: "bg-blue-100 text-blue-800 border border-blue-200",
    failed: "bg-red-100 text-red-800 border border-red-200",
  };

  const label = (() => {
    switch (state.kind) {
      case "online":
        return "Online";
      case "offline":
        return `Offline — ${queued > 0 ? `${queued} pending` : "cached data"}`;
      case "syncing":
        return `Syncing — ${state.remaining} remaining`;
      case "failed":
        return `Sync failed — ${state.remaining} pending`;
    }
  })();

  const ariaLabel = (() => {
    switch (state.kind) {
      case "online":
        return "Online, all changes saved.";
      case "offline":
        return queued > 0
          ? `Offline, ${queued} changes pending sync.`
          : "Offline, showing cached data.";
      case "syncing":
        return `Syncing, ${state.remaining} items pending.`;
      case "failed":
        return `Sync failed, ${state.remaining} items remaining.`;
    }
  })();

  const indicatorColor = (() => {
    switch (state.kind) {
      case "online": return "#22c55e";
      case "offline": return "#eab308";
      case "syncing": return "#3b82f6";
      case "failed": return "#ef4444";
    }
  })();

  if (state.kind === "online") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={ariaLabel}
      className={`${baseClasses} ${variants[state.kind]} motion-reduce:transition-none`}
    >
      <span
        className="inline-block w-2 h-2 rounded-full motion-safe:animate-pulse"
        style={{ backgroundColor: indicatorColor }}
        aria-hidden="true"
      />
      <span className="truncate max-w-[200px]">{label}</span>
    </div>
  );
}