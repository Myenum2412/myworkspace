"use client";

import { useEffect, useRef, useCallback } from "react";
import { syncOfflineRequests } from "@/lib/offline-sync";
import { toast } from "sonner";
import { onlineManager } from "@tanstack/react-query";
import { triggerSync } from "@/lib/offline/sync-processor";
import { getQueueLength } from "@/lib/offline/queue";

export function OfflineSyncManager() {
  const syncInProgress = useRef(false);
  const swRegistered = useRef(false);
  const onlineListenerAdded = useRef(false);
  const onlineManagerInitialized = useRef(false);

  const performSync = useCallback(async () => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      const queueLen = await getQueueLength();
      clearTimeout(timer);
      if (queueLen === 0) return;

      await syncOfflineRequests();
      triggerSync();
    } catch (err) {
      console.error("[OfflineSync] Sync failed:", err);
    } finally {
      syncInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    if (!onlineManagerInitialized.current) {
      onlineManagerInitialized.current = true;
      onlineManager.setEventListener((setOnline) => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
          window.removeEventListener("online", handleOnline);
          window.removeEventListener("offline", handleOffline);
        };
      });
    }

    if ("serviceWorker" in navigator && !swRegistered.current) {
      swRegistered.current = true;
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
    }

    if (!onlineListenerAdded.current) {
      onlineListenerAdded.current = true;
      const handleOnline = async () => {
        try {
          await performSync();
        } catch (err) {
          console.error("Failed to sync offline data", err);
        }
      };
      window.addEventListener("online", handleOnline);
      if (navigator.onLine) {
        performSync();
      }
      return () => {
        window.removeEventListener("online", handleOnline);
      };
    }
  }, [performSync]);

  return null;
}