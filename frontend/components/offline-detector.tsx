"use client";

import { useEffect, useState } from "react";
import { NotFoundContent } from "@/components/not-found-content";

export function OfflineDetector({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" && !navigator.onLine,
  );

  useEffect(() => {

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (isOffline) {
    return <NotFoundContent variant="offline" />;
  }

  return <>{children}</>;
}
