"use client";

import { useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useBootstrapStore } from "@/stores/bootstrap-store";
import { useQueryClient } from "@tanstack/react-query";
import { fetchBootstrapData, invalidateBootstrapCache } from "@/lib/api/bootstrap";
import { recordLoginTime } from "@/lib/performance";

type LoginState = {
  loading: boolean;
  error: string | null;
  step: "idle" | "authenticating" | "fetching-data" | "hydrating" | "redirecting" | "done";
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
      const csrfRes = await fetch("/api/auth/csrf");
      const csrfBody = await csrfRes.text();
      let csrfToken: string;
      try {
        csrfToken = JSON.parse(csrfBody).csrfToken;
      } catch {
        setState({ loading: false, error: "Authentication service unavailable. Check your connection.", step: "idle" });
        return;
      }

      setState((s) => ({ ...s, step: "fetching-data" }));

      const signInRes = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken,
          email,
          password,
          json: "true",
        }),
      });

      const signInBody = await signInRes.text();
      let signInData: any;
      try {
        signInData = JSON.parse(signInBody);
      } catch {
        setState({ loading: false, error: "Authentication service unavailable. Try again.", step: "idle" });
        return;
      }

      if (!signInData.ok || signInData.error) {
        setState({ loading: false, error: signInData.error || "Invalid credentials", step: "idle" });
        return;
      }

      setState((s) => ({ ...s, step: "hydrating" }));

      const [bootstrapData] = await Promise.all([
        fetchBootstrapData(true),
        updateSession(),
      ]);

      setBootstrapData(bootstrapData);
      invalidateBootstrapCache();

      const role = bootstrapData?.user?.role?.toLowerCase() || "";
      const redirectPath =
        role === "org_menu_admin" || role === "super_admin"
          ? "/orgmenu"
          : role === "client" || role === "client_user"
            ? "/client/dashboard"
            : ["workspace", "admin", "manager"].includes(role)
              ? "/dashboard"
              : "/staffs";

      queryClient.setQueryData(["bootstrap", "data"], bootstrapData);

      setState((s) => ({ ...s, step: "redirecting" }));

      recordLoginTime(performance.now() - loginStart);

      router.replace(redirectPath);
      router.refresh();

      setState({ loading: false, error: null, step: "done" });
    } catch (err) {
      console.error("[INSTANT_LOGIN] Failed:", err);
      setState({
        loading: false,
        error: err instanceof Error ? err.message : "Something went wrong",
        step: "idle",
      });
    }
  }, [router, updateSession, setBootstrapData, queryClient]);

  return { ...state, instantLogin };
}
