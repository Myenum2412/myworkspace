"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useBootstrapStore } from "@/stores/bootstrap-store";
import { useQueryClient } from "@tanstack/react-query";
import { fetchBootstrapData, invalidateBootstrapCache } from "@/lib/api/bootstrap";
import { recordLoginTime } from "@/lib/performance";
import { ROLES } from "@/lib/rbac";
import { apiUrl } from "@/lib/api";

const AUTH_ERRORS: Record<string, string> = {
  CredentialsSignin: "Invalid email or password. Please try again.",
  OAuthSignin: "There was a problem signing in with this provider.",
  OAuthCallback: "There was a problem signing in with this provider.",
  OAuthCreateAccount: "Could not create an account with this provider.",
  EmailCreateAccount: "Could not create an account with this email.",
  Callback: "There was a problem signing in.",
  OAuthAccountNotLinked: "This email is already associated with another account.",
  EmailSignin: "There was a problem sending the verification email.",
  SessionRequired: "Please sign in to access this page.",
  Configuration: "Server configuration error. Please contact support.",
  AccessDenied: "Access denied. You don't have permission to access this resource.",
};

type LoginState = {
  loading: boolean;
  error: string | null;
  step: "idle" | "challenging" | "authenticating" | "fetching-data" | "hydrating" | "redirecting" | "done";
};

export function useInstantLogin() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const setBootstrapData = useBootstrapStore((s) => s.setData);
  const [state, setState] = useState<LoginState>({
    loading: false,
    error: null,
    step: "idle",
  });

  const instantLogin = useCallback(async (email: string, password: string) => {
    const loginStart = performance.now();
    setState({ loading: true, error: null, step: "authenticating" });

    try {
      let signInData: any;
      try {
        signInData = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
      } catch {
        setState({ loading: false, error: "Authentication service unavailable. Check your connection.", step: "idle" });
        return;
      }

      if (!signInData.ok || signInData.error) {
        setState({ loading: false, error: AUTH_ERRORS[signInData.error] || signInData.error || "Invalid email or password. Please try again.", step: "idle" });
        return;
      }

      setState((s) => ({ ...s, step: "fetching-data" }));

      const [bootstrapData] = await Promise.all([
        fetchBootstrapData(true),
        updateSession(),
      ]);

      setBootstrapData(bootstrapData);
      invalidateBootstrapCache();

      const role = bootstrapData?.user?.role?.toLowerCase() || "";
      const redirectPath =
        role === ROLES.ORG_ADMIN
          ? "/orgmenu"
          : role === ROLES.CLIENTS
            ? "/client/dashboard"
            : role === ROLES.MEMBERS
              ? "/dashboard"
              : role === ROLES.STAFFS || role === ROLES.TEAM_STAFF
                ? "/staffs"
                : "/dashboard";

      queryClient.setQueryData(["bootstrap", "data"], bootstrapData);

      setState((s) => ({ ...s, step: "redirecting" }));

      recordLoginTime(performance.now() - loginStart);

      router.replace(redirectPath);
      router.refresh();

      setState({ loading: false, error: null, step: "done" });
    } catch (err) {
      console.error("[INSTANT_LOGIN] Failed:", err);
      const msg = err instanceof TypeError ? "Could not connect to server. Check your connection and try again." : err instanceof Error ? err.message : "Something went wrong";
      setState({ loading: false, error: msg, step: "idle" });
    }
  }, [router, updateSession, setBootstrapData, queryClient]);

  return { ...state, instantLogin };
}
