"use client";

import { useState, useEffect, useCallback } from "react";

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const isSupported = "Notification" in window && "serviceWorker" in navigator;
    setSupported(isSupported);
    if (isSupported) {
      setPermission(Notification.permission as NotificationPermissionState);
    } else {
      setPermission("unsupported");
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return "unsupported";
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      return result as NotificationPermissionState;
    } catch {
      setPermission("denied");
      return "denied";
    }
  }, []);

  return { permission, supported, requestPermission };
}
