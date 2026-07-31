"use client";

import { useMemo } from "react";
import Stats07 from "@/components/stats-07";
import type { Project } from "@/components/projects/project-types";
import { useIndustry } from "@/components/industry-provider";

interface DashboardProps {
  projects: Project[];
}

export default function ProjectsDashboard({ projects }: DashboardProps) {
  const { t } = useIndustry();
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "Active").length;
    const completed = projects.filter((p) => p.progress === 100).length;
    const inProgress = projects.filter((p) => p.progress > 0 && p.progress < 100).length;
    const notStarted = projects.filter((p) => p.progress === 0).length;
    const overdue = projects.filter((p) => {
      if (!p.deadline) return false;
      return new Date(p.deadline).getTime() < Date.now() && p.progress < 100;
    }).length;
    const atRisk = projects.filter((p) => {
      if (p.health === "at-risk" || p.health === "delayed") return true;
      if (!p.deadline || p.progress >= 100) return false;
      const deadline = new Date(p.deadline).getTime();
      const diff = deadline - Date.now();
      return diff < 7 * 24 * 60 * 60 * 1000;
    }).length;
    const avgProgress = total > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / total) : 0;

    return { total, active, completed, inProgress, notStarted, overdue, atRisk, avgProgress };
  }, [projects]);

  return (
    <Stats07
      items={[
        { name: t("page.projects.statsTotal"), value: stats.total, subtitle: t("page.projects.statsTotalSub") },
        { name: t("common.active"), value: stats.active, subtitle: t("page.dashboard.inProgress") },
        { name: t("page.projects.statsCompleted"), value: stats.completed, subtitle: t("page.projects.statsCompletedSub") },
        { name: t("page.dashboard.inProgress"), value: stats.inProgress, subtitle: t("page.projects.statsInProgressSub") },
        { name: t("page.dashboard.overdue"), value: stats.overdue, subtitle: t("page.projects.statsOverdueSub") },
        { name: t("page.projects.statsAvgProgress"), value: stats.avgProgress, subtitle: t("page.projects.statsAvgProgressSub") },
      ]}
    />
  );
}
