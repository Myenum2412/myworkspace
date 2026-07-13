"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { isAppPage } from "@/lib/app-context";

export function AppInitProvider({ children }: { children: ReactNode }) {
  const { status: sessionStatus } = useSession();
  const pathname = usePathname();
  const initStartedRef = useRef(false);

  const isInitRequired = isAppPage(pathname);

  useEffect(() => {
    if (!isInitRequired) {
      initStartedRef.current = false;
      return;
    }

    if (sessionStatus === "authenticated" && !initStartedRef.current) {
      initStartedRef.current = true;

      // Fire-and-forget: warm up caches without blocking render
      Promise.allSettled([
        fetch("/api/user/profile", { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/settings", { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
    }

    if (sessionStatus === "unauthenticated") {
      initStartedRef.current = false;
    }
  }, [sessionStatus, isInitRequired]);

  return <>{children}</>;
}
