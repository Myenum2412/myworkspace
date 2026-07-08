"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Initializes notification infrastructure on app load:
 * - Requests notification permission on first login
 * - Registers push subscription if permission granted
 */
export function NotificationInitializer() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!("Notification" in window)) return;

    // If permission hasn't been decided yet, request it
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    // Subscribe to push if permission is granted
    if (Notification.permission === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then(async (reg) => {
          try {
            const publicKeyRes = await fetch("/api/notifications/vapid-public-key");
            const publicKeyData = await publicKeyRes.json();
            const publicKey = publicKeyData.data?.publicKey;
            if (!publicKey) return;

            const existingSub = await reg.pushManager.getSubscription();
            if (existingSub) return; // Already subscribed

            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
            });

            await fetch("/api/notifications/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                endpoint: sub.endpoint,
                keys: {
                  p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
                  auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
                },
                userAgent: navigator.userAgent,
              }),
            });
          } catch {}
        })
        .catch(() => {});
    }
  }, [status]);

  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
