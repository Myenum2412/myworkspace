"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { OnboardingInteractive } from "./onboarding-interactive";
import { ROLES } from "@/lib/rbac";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?error=Please+sign+in+to+complete+onboarding");
      return;
    }
    if (status === "authenticated" && session?.user) {
      if (session.user.role === ROLES.ORG_ADMIN) {
        router.push("/orgmenu");
      } else if (session.user.onboardingCompleted) {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  if (!session?.user) return null;

  const isOrgAdmin = session.user.role === ROLES.ORG_ADMIN;
  if (isOrgAdmin || session.user.onboardingCompleted) return null;

  return <OnboardingInteractive />;
}
