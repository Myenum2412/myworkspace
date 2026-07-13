"use client";

import { useEffect, useRef, useCallback } from "react";
import { syncOfflineRequests } from "@/lib/offline-sync";
import { toast } from "sonner";

export function OfflineSyncManager() {
  const syncInProgress = useRef(false);

  const performSync = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return;
    syncInProgress.current = true;
    try {
      const { getQueueLength } = await import("@/lib/offline/queue");
      const queueLen = await getQueueLength();
      if (queueLen === 0) return;

      await syncOfflineRequests();
      const { triggerSync } = await import("@/lib/offline/sync-processor");
      triggerSync();
    } catch (err) {
      console.error("[OfflineSync] Sync failed:", err);
    } finally {
      syncInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              toast.info("A new version is available. Refresh to update.", {
                id: "sw-update",
                duration: 8000,
                action: {
                  label: "Refresh",
                  onClick: () => {
                    newWorker.postMessage({ type: "SKIP_WAITING" });
                    window.location.reload();
                  },
                },
              });
            }
          });
        });
      } catch (err) {
        console.error("Service Worker registration failed:", err);
      }
    };

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", () => registerSW(), { once: true });
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => performSync();
    window.addEventListener("online", handleOnline);

    if (navigator.onLine) {
      // Defer sync to not block initial render
      const t = setTimeout(performSync, 2000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("online", handleOnline);
      };
    }

    return () => window.removeEventListener("online", handleOnline);
  }, [performSync]);

  return null;
}
