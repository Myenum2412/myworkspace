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
  queued: number
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

  // Periodically refresh queue length while syncing
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
    "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-colors";

  const variants: Record<BannerState["kind"], string> = {
    online: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    offline: "bg-amber-100 text-amber-800 border border-amber-200",
    syncing: "bg-[#e8ece4] text-[#2d4029] border border-[#c5cec0]",
    failed: "bg-red-100 text-red-800 border border-red-200",
  };

  const label = (() => {
    switch (state.kind) {
      case "online":
        return "Online — All saved";
      case "offline":
        return "Offline — Saving locally";
      case "syncing":
        return `Syncing — ${state.remaining} pending`;
      case "failed":
        return `Sync failed — ${state.remaining} items`;
    }
  })();

  const ariaLabel = (() => {
    switch (state.kind) {
      case "online":
        return "Online, all changes saved.";
      case "offline":
        return "Offline, saving changes locally.";
      case "syncing":
        return `Syncing, ${state.remaining} items pending.`;
      case "failed":
        return `Sync failed, ${state.remaining} items remaining.`;
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
      <span aria-hidden="true">
        {state.kind === "offline" && "🟡"}
        {state.kind === "syncing" && "🔵"}
        {state.kind === "failed" && "🔴"}
      </span>
      <span>{label}</span>
    </div>
  );
}
