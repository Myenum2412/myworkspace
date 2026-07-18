"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useBootstrapStore } from "@/stores/bootstrap-store";

interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  todayTasks: number;
  pendingApproval: number;
}

export function useInstantDashboard() {
  const { data: session } = useSession();
  const bootstrap = useBootstrapStore((s) => s.data);
  const isHydrated = useBootstrapStore((s) => s.isHydrated);

  const dashboardQuery = useQuery<DashboardMetrics>({
    queryKey: ["dashboard", "metrics", bootstrap?.orgId],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/metrics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
      const json = await res.json();
      return json.data;
    },
    enabled: !!bootstrap?.orgId && isHydrated,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: () => ({
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      overdueTasks: 0,
      todayTasks: 0,
      pendingApproval: 0,
    }),
  });

  return {
    metrics: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    isPlaceholder: dashboardQuery.isPlaceholderData,
    error: dashboardQuery.error,
    bootstrap,
    isHydrated,
    session,
    orgId: bootstrap?.orgId,
  };
}
