"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import FolderIcon from "@mui/icons-material/Folder";
import {
  AlertCircleIcon, CheckCircle2Icon, ClockIcon, TrendingUpIcon,
  ArrowUpIcon, ArrowDownIcon, UsersIcon,
} from "lucide-react";
import type { Project } from "@/components/projects/project-types";

interface DashboardProps {
  projects: Project[];
  onView: (project: Project) => void;
}

const STATUS_COLORS = {
  "Active": "#22c55e",
  "Inactive": "#94a3b8",
};

const HEALTH_COLORS: Record<string, string> = {
  "on-track": "#22c55e",
  "at-risk": "#f59e0b",
  "delayed": "#ef4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  "low": "#94a3b8",
  "medium": "#3b82f6",
  "high": "#f59e0b",
  "critical": "#ef4444",
};

function getHealth(project: Project): "on-track" | "at-risk" | "delayed" {
  if (project.health) return project.health;
  if (!project.deadline) return "on-track";
  const now = Date.now();
  const deadline = new Date(project.deadline).getTime();
  const diff = deadline - now;
  if (diff < 0) return "delayed";
  if (diff < 7 * 24 * 60 * 60 * 1000) return "at-risk";
  return "on-track";
}

export default function ProjectsDashboard({ projects, onView }: DashboardProps) {
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

  const statusData = useMemo(() => [
    { name: "Active", value: projects.filter((p) => p.status === "Active").length, color: "#22c55e" },
    { name: "Inactive", value: projects.filter((p) => p.status === "Inactive").length, color: "#94a3b8" },
  ], [projects]);

  const progressData = useMemo(() => {
    const ranges = [
      { name: "0%", min: 0, max: 0 },
      { name: "1-25%", min: 1, max: 25 },
      { name: "26-50%", min: 26, max: 50 },
      { name: "51-75%", min: 51, max: 75 },
      { name: "76-99%", min: 76, max: 99 },
      { name: "100%", min: 100, max: 100 },
    ];
    return ranges.map((r) => ({
      name: r.name,
      count: projects.filter((p) => p.progress >= r.min && p.progress <= r.max).length,
    }));
  }, [projects]);

  const upcomingDeadlines = useMemo(() => {
    return projects
      .filter((p) => p.deadline && p.progress < 100)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 5);
  }, [projects]);

  const topProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Project Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Progress Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No upcoming deadlines</p>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((p) => {
                  const health = getHealth(p);
                  const daysLeft = Math.ceil((new Date(p.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <button
                      key={p.id}
                      onClick={() => onView(p)}
                      className="w-full flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="size-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: p.color }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.client}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium">{new Date(p.deadline!).toLocaleDateString()}</p>
                        <Badge variant={daysLeft < 0 ? "destructive" : daysLeft <= 7 ? "secondary" : "outline"} className="text-[10px] mt-0.5">
                          {daysLeft < 0 ? "Overdue" : `${daysLeft}d left`}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500" />
              Top Progress Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No projects yet</p>
            ) : (
              <div className="space-y-3">
                {topProjects.map((p) => {
                  const health = getHealth(p);
                  const healthColor =
                    health === "on-track" ? "bg-green-100 text-green-700 border-green-300" :
                    health === "at-risk" ? "bg-amber-100 text-amber-700 border-amber-300" :
                    "bg-red-100 text-red-700 border-red-300";
                  return (
                    <button
                      key={p.id}
                      onClick={() => onView(p)}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">{p.name}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold px-2 py-0.5 ${healthColor}`}
                          >
                            {health === "on-track" ? <ArrowUpIcon className="size-3 mr-0.5" /> :
                             health === "at-risk" ? <AlertCircleIcon className="size-3 mr-0.5" /> :
                             <ArrowDownIcon className="size-3 mr-0.5" />}
                            {health}
                          </Badge>
                          <span className="text-xs font-semibold text-muted-foreground">{p.progress}%</span>
                        </div>
                      </div>
                      <Progress value={p.progress} className="h-2" />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
