"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAppContext, isRouteInContext } from "@/lib/app-context";

const CONTEXT_HOME_PAGES: Record<string, string> = {
  origin: "/orgmenu",
  workspace: "/dashboard",
  staff: "/staffs",
};

interface ContextGuardProps {
  expectedContext: "origin" | "workspace" | "staff";
  children: ReactNode;
}

export function ContextGuard({ expectedContext, children }: ContextGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isRouteInContext(pathname, expectedContext)) {
      const homePage = CONTEXT_HOME_PAGES[expectedContext] || "/dashboard";
      router.replace(homePage);
    }
  }, [pathname, expectedContext, router]);

  return <>{children}</>;
}
