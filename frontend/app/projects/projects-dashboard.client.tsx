"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import FolderIcon from "@mui/icons-material/Folder";
import {
  AlertCircleIcon, CheckCircle2Icon, ClockIcon, TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import type { Project } from "@/components/projects/project-types";

interface DashboardProps {
  projects: Project[];
}

export default function ProjectsDashboard({ projects }: DashboardProps) {
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
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <FolderIcon className="size-3.5" /> Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.active} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUpIcon className="size-3.5" /> In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.notStarted} not started</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2Icon className="size-3.5" /> Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0}% completion rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircleIcon className="size-3.5" /> At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.atRisk}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.overdue} overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ClockIcon className="size-3.5" /> Avg Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProgress}%</div>
            <Progress value={stats.avgProgress} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <UsersIcon className="size-3.5" /> Team Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.reduce((s, p) => s + (p.members?.length || 0), 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">across {projects.length} projects</p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
