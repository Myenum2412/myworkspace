"use client";

import { useEffect, useRef, memo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const PUBLIC_ROUTES = [
  "/pricing", "/login", "/signup", "/signup-mongo", "/forgot-password", "/client/login",
  "/features", "/solutions", "/platform", "/about", "/blog", "/contact", "/careers",
  "/changelog", "/docs", "/guides", "/new-update", "/notifications",
];

export const SubscriptionGuard = memo(function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (status === "loading" || status === "unauthenticated") return;
    if (redirectedRef.current) return;
    if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) return;
    if (pathname.startsWith("/api")) return;

    const user = session?.user as Record<string, unknown> | undefined;
    const subStatus = user?.subscriptionStatus as string | undefined;
    const trialEnd = user?.trialEnd as string | undefined;
    const plan = user?.plan as string | undefined;

    if (plan === "enterprise") return;

    if (subStatus === "trialing" && trialEnd) {
      if (Date.now() > new Date(trialEnd).getTime()) {
        redirectedRef.current = true;
        router.push("/pricing?expired=trial");
        return;
      }
    }

    if (subStatus && !["active", "trialing"].includes(subStatus)) {
      redirectedRef.current = true;
      router.push("/pricing?expired=subscription");
      return;
    }
  }, [status, session, router, pathname]);

  return <>{children}</>;
});
