"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export function NotificationInitializer() {
  const { data: session, status } = useSession();
  const initRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || initRef.current) return;
    initRef.current = true;

    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    if (Notification.permission === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          const existingSub = await reg.pushManager.getSubscription();
          if (existingSub) return;

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5_000);
          const publicKeyRes = await fetch("/api/notifications/vapid-public-key", {
            signal: controller.signal,
          });
          clearTimeout(timer);
          const publicKeyData = await publicKeyRes.json();
          const publicKey = publicKeyData.data?.publicKey;
          if (!publicKey) return;

          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as string,
          });

          // Fire-and-forget: don't await the subscription POST
          fetch("/api/notifications/push/subscribe", {
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
          }).catch(() => {});
        } catch {}
      }).catch(() => {});
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
