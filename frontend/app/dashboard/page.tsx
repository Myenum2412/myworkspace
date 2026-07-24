"use client";

import { DashboardOverviewClient } from "./dashboard-overview-client";

export type ReportsData = {
  total: number; completed: number; inProgress: number; overdue: number;
  priorityBreakdown: { label: string; count: number; color: string }[];
  statusBreakdown: { label: string; count: number; color: string }[];
};

export default function DashboardPage() {
  return <DashboardOverviewClient />;
}
