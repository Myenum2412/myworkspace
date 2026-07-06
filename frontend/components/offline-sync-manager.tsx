"use client";

import { useEffect } from "react";
import { syncOfflineRequests } from "@/lib/offline-sync";
import { toast } from "sonner";

export function OfflineSyncManager() {
  useEffect(() => {
    // Register Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("/sw.js").then(
          function (registration) {
            console.log("Service Worker registration successful with scope: ", registration.scope);
          },
          function (err) {
            console.log("Service Worker registration failed: ", err);
          }
        );
      });
    }

    const handleOnline = async () => {
      try {
        await syncOfflineRequests();
        toast.success("Offline data synchronized with the server.", {
          id: "offline-sync",
        });
      } catch (err) {
        console.error("Failed to sync offline data", err);
      }
    };

    window.addEventListener("online", handleOnline);

    // Also try syncing on mount if online
    if (navigator.onLine) {
      syncOfflineRequests();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
