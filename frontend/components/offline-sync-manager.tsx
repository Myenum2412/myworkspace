"use client";

import { useEffect } from "react";
import { syncOfflineRequests } from "@/lib/offline-sync";
import { toast } from "sonner";
import { onlineManager } from "@tanstack/react-query";

export function OfflineSyncManager() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js");
          console.log("Service Worker registered with scope:", registration.scope);

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
        window.addEventListener("load", () => registerSW());
      }
    }

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

    const handleOnline = async () => {
      try {
        await syncOfflineRequests();
        toast.success("All offline data synchronized.", {
          id: "offline-sync",
        });
      } catch (err) {
        console.error("Failed to sync offline data", err);
      }
    };

    window.addEventListener("online", handleOnline);

    if (navigator.onLine) {
      syncOfflineRequests();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
