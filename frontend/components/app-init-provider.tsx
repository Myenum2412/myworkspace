"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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

  const results = await Promise.allSettled(
    criticalEndpoints.map(async (endpoint, index) => {
      setProgress(PROGRESS_STEPS[index + 1]);
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed: ${endpoint}`);
      return res.json();
    }),
  );

  setProgress(PROGRESS_STEPS[PROGRESS_STEPS.length - 1]);
}

export function AppInitProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const pathname = usePathname();
  const { status: initStatus, progress, startInit, completeInit, setProgress, reset } = useAppInitStore();
  const initStartedRef = useRef(false);

  const isInitRequired = isAppPage(pathname);

  useEffect(() => {
    if (!isInitRequired) {
      reset();
      initStartedRef.current = false;
      return;
    }

    if (sessionStatus === "authenticated" && session && !initStartedRef.current) {
      initStartedRef.current = true;
      startInit();
      fetchCriticalData(setProgress).then(() => {
        completeInit();
      });
    }

    if (sessionStatus === "unauthenticated") {
      reset();
      initStartedRef.current = false;
    }
  }, [sessionStatus, session, isInitRequired, startInit, completeInit, setProgress, reset]);

  if (!isInitRequired) {
    return <>{children}</>;
  }

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

  if (sessionStatus === "unauthenticated") {
    return <>{children}</>;
  }

  return <>{children}</>;
}