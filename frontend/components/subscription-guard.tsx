"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

const PUBLIC_ROUTES = ["/pricing", "/login", "/signup", "/signup-mongo", "/forgot-password", "/client/login"];

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      setChecking(false);
      return;
    }

    // Skip check for public routes
    if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
      setChecking(false);
      return;
    }

    // Skip for API routes
    if (pathname.startsWith("/api")) {
      setChecking(false);
      return;
    }

    const user = session?.user as Record<string, unknown> | undefined;
    const subStatus = user?.subscriptionStatus as string | undefined;
    const trialEnd = user?.trialEnd as string | undefined;
    const plan = user?.plan as string | undefined;

    // Enterprise always has access
    if (plan === "enterprise") {
      setChecking(false);
      return;
    }

    // Check trial expiration
    if (subStatus === "trialing" && trialEnd) {
      const now = Date.now();
      const trialEndMs = new Date(trialEnd).getTime();
      if (now > trialEndMs) {
        setBlocked(true);
        router.push("/pricing?expired=trial");
        return;
      }
    }

    // Check active subscription
    if (subStatus && !["active", "trialing"].includes(subStatus)) {
      setBlocked(true);
      router.push("/pricing?expired=subscription");
      return;
    }

    setChecking(false);
  }, [status, session, router, pathname]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
