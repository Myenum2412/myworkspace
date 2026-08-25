"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { initNotificationSync } from "../lib/websocket-sync";

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
  }, [status]);

  useEffect(() => {
    const cleanup = initNotificationSync();
    return () => cleanup();
  }, []);

  return null;
}
