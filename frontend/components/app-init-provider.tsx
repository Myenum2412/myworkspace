"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useAppInitStore } from "@/lib/app-init-store";
import { isAppPage } from "@/lib/app-context";
import Loader from "@/components/kokonutui/loader";

const PROGRESS_STEPS = [
  "Loading your workspace...",
  "Fetching your profile...",
  "Loading permissions...",
  "Syncing your settings...",
  "Preparing your dashboard...",
  "Almost ready...",
];

async function fetchCriticalData(setProgress: (msg: string) => void) {
  const criticalEndpoints = ["/api/user/profile", "/api/settings"];

  for (const [index, endpoint] of criticalEndpoints.entries()) {
    setProgress(PROGRESS_STEPS[index + 1]);
    try {
      await fetch(endpoint, { credentials: "include" });
    } catch {
      // Non-critical - pages will handle individual fetch failures
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  setProgress(PROGRESS_STEPS[PROGRESS_STEPS.length - 1]);
  await new Promise((r) => setTimeout(r, 200));
}

export function AppInitProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const pathname = usePathname();
  const { status: initStatus, progress, startInit, completeInit, setProgress, reset } = useAppInitStore();
  const initStartedRef = useRef(false);

  const isInitRequired = isAppPage(pathname);

  useEffect(() => {
    // Reset on public pages
    if (!isInitRequired) {
      reset();
      initStartedRef.current = false;
      return;
    }

    // Start initialization when session becomes available after login
    if (sessionStatus === "authenticated" && session && !initStartedRef.current) {
      initStartedRef.current = true;
      startInit();

      fetchCriticalData(setProgress).then(() => {
        // Small delay to ensure smooth transition
        setTimeout(() => completeInit(), 200);
      });
    }

    // Reset when user logs out
    if (sessionStatus === "unauthenticated") {
      reset();
      initStartedRef.current = false;
    }
  }, [sessionStatus, session, isInitRequired, startInit, completeInit, setProgress, reset]);

  // Not an app page (login, signup, etc.) - render without loader
  if (!isInitRequired) {
    return <>{children}</>;
  }

  // Session loading or initialization in progress - show full-screen loader
  if (sessionStatus === "loading" || initStatus === "initializing") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
        <Loader
          size="md"
          title={initStatus === "initializing" ? "Configuring your account..." : "Signing in..."}
          subtitle={initStatus === "initializing" ? progress : "Please wait"}
        />
      </div>
    );
  }

  // Unauthenticated on protected page - let children handle redirect
  if (sessionStatus === "unauthenticated") {
    return <>{children}</>;
  }

  // Fully initialized - render app
  return <>{children}</>;
}
