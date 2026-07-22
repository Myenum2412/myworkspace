"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ClockIcon, AlertCircleIcon, CheckCircle2Icon, CircleIcon,
  PlusIcon,
} from "lucide-react";
import type { Project } from "@/components/projects/project-types";

interface BoardProps {
  projects: Project[];
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
}

const COLUMNS = [
  {
    id: "not-started",
    title: "Not Started",
    icon: CircleIcon,
    color: "border-t-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-950/50",
    filter: (p: Project) => p.progress === 0 && p.status === "Active",
  },
  {
    id: "in-progress",
    title: "In Progress",
    icon: ClockIcon,
    color: "border-t-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    filter: (p: Project) => p.progress > 0 && p.progress < 100 && p.status === "Active",
  },
  {
    id: "review",
    title: "Review",
    icon: AlertCircleIcon,
    color: "border-t-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    filter: (p: Project) => p.progress >= 100 && p.status === "Active",
  },
  {
    id: "completed",
    title: "Completed",
    icon: CheckCircle2Icon,
    color: "border-t-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/50",
    filter: (p: Project) => p.status === "Inactive",
  },
];

const PRIORITY_BORDERS: Record<string, string> = {
  low: "border-l-slate-300",
  medium: "border-l-blue-400",
  high: "border-l-amber-400",
  critical: "border-l-red-500",
};

function ProjectCard({ project, onView }: { project: Project; onView: (p: Project) => void }) {
  const priority = project.priority || "medium";
  const daysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <button
      onClick={() => onView(project)}
      className={cn(
        "w-full text-left rounded-sm border border-l-4 bg-white p-3 shadow-sm hover:shadow-md transition-all",
        PRIORITY_BORDERS[priority] || "border-l-blue-400"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className="size-7 rounded-sm flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
          style={{ backgroundColor: project.color }}
        >
          {project.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{project.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{project.client}</p>
        </div>
      </div>

      {project.description && (
        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center gap-2 mt-2.5">
        {project.progress > 0 && (
          <div className="flex-1 h-1.5 rounded-sm bg-muted overflow-hidden">
            <div
              className="h-full rounded-sm bg-primary transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        )}
        {project.progress > 0 && (
          <span className="text-[10px] text-muted-foreground shrink-0">{project.progress}%</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        {daysLeft !== null && (
          <span className={cn("text-[10px] font-medium", daysLeft < 0 ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-muted-foreground")}>
            {daysLeft < 0 ? "Overdue" : `${daysLeft}d left`}
          </span>
        )}
        {project.members && project.members.length > 0 && (
          <span className="text-[10px] text-muted-foreground">{project.members.length} member{project.members.length > 1 ? "s" : ""}</span>
        )}
      </div>
    </button>
  );
}

export default function ProjectsBoard({ projects, onView, onEdit }: BoardProps) {
  return (
    <div className="grid grid-cols-4 gap-4 h-full">
      {COLUMNS.map((col) => {
        const colProjects = projects.filter(col.filter);
        const Icon = col.icon;
        return (
          <div key={col.id} className={cn("flex flex-col rounded-sm border-t-4", col.color, col.bgColor)}>
            <div className="flex items-center justify-between px-3 py-3 border-b">
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{col.title}</h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {colProjects.length}
                </Badge>
              </div>
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {colProjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No projects</p>
                ) : (
                  colProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} onView={onView} />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
