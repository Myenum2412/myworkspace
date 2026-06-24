"use client";

import * as React from "react";

export interface ConnectivityState {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useConnectivity(): ConnectivityState {
  const [isOnline, setIsOnline] = React.useState<boolean>(() => {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine !== false;
  });
  const [wasOffline, setWasOffline] = React.useState(false);
  const wasOfflineRef = React.useRef(false);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        setWasOffline(true);
      }
    };
    const handleOffline = () => {
      wasOfflineRef.current = true;
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  React.useEffect(() => {
    if (isOnline) {
      const t = setTimeout(() => setWasOffline(false), 0);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  return { isOnline, wasOffline };
}
