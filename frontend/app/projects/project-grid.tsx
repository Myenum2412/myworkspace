"use client";

import { DeleteConfirmDialog } from "@/components/dialog-03";
import type { Project } from "@/components/projects/project-types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircleIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  FolderIcon,
  LockIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "@/lib/icons";
import { cn } from "@/lib/utils";

export interface ProjectGridProps {
  projects: Project[];
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onNewProject: () => void;
}

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  high: "bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  critical: "bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

function getDueStatus(project: Project): "overdue" | "due-soon" | "normal" {
  if (!project.deadline) return "normal";
  if (project.progress >= 100) return "normal";
  const diff = new Date(project.deadline).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff <= 24 * 60 * 60 * 1000) return "due-soon";
  return "normal";
}

function initials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ProjectCard({
  project,
  onView,
  onEdit,
  onDelete,
}: {
  project: Project;
  onView: (p: Project) => void;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  const due = getDueStatus(project);
  const priority = project.priority || "medium";
  const date = project.deadline
    ? new Date(project.deadline).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <article
      onClick={() => onView(project)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView(project);
        }
      }}
      className="surface-hover group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: project.color }} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight">{project.name}</h3>
            {project.client ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.client}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <span
              className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                PRIORITY_BADGE[priority] || PRIORITY_BADGE.medium,
              )}
            >
              {priority}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onView(project)}>
                  <EyeIcon className="size-3.5 mr-2" /> View project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <PencilIcon className="size-3.5 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DeleteConfirmDialog
                  title="Delete Project"
                  description={`Are you sure you want to delete ${project.name}? This action cannot be undone.`}
                  onConfirm={() => onDelete(project)}
                >
                  <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                    <Trash2Icon className="size-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </DeleteConfirmDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {project.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              project.status === "Active"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {project.status}
          </span>
          {project.category ? (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
              {project.category}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            {project.access === "Private" ? <LockIcon className="size-3" /> : null}
            {project.access}
          </span>
        </div>

        <div className="mt-auto space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium tabular-nums">{project.progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, project.progress))}%`,
                backgroundColor: project.color,
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-2.5 text-xs text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center gap-1.5",
              due === "overdue" && "font-medium text-red-600",
              due === "due-soon" && "font-medium text-amber-600",
            )}
          >
            {date ? <CalendarIcon className="size-3.5" /> : <ClockIcon className="size-3.5" />}
            {date ?? "No deadline"}
            {due === "overdue" && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 px-1 text-[10px] font-semibold text-red-600 dark:bg-red-900/40 dark:text-red-400">
                <AlertCircleIcon className="size-3" /> overdue
              </span>
            )}
            {due === "due-soon" && (
              <span className="rounded-md bg-amber-50 px-1 text-[10px] font-semibold text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                soon
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <ClockIcon className="size-3.5" />
              {project.tracked}h
            </span>
            {project.members && project.members.length > 0 ? (
              <span className="inline-flex items-center gap-1">
                <span className="flex -space-x-1.5">
                  {project.headAvatar || project.headName ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-muted-foreground ring-2 ring-card">
                      {project.headAvatar ? (
                        <img
                          src={project.headAvatar}
                          alt=""
                          className="size-full rounded-full object-cover"
                        />
                      ) : (
                        initials(project.headName)
                      )}
                    </span>
                  ) : (
                    <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-muted-foreground ring-2 ring-card">
                      <UsersIcon className="size-2.5" />
                    </span>
                  )}
                </span>
                <span className="tabular-nums">{project.members.length}</span>
              </span>
            ) : project.headName ? (
              <span className="inline-flex items-center gap-1">
                <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-muted-foreground ring-2 ring-card">
                  {initials(project.headName)}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ProjectGrid({
  projects,
  onView,
  onEdit,
  onDelete,
  onNewProject,
}: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card/50 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <FolderIcon className="size-7 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-base font-semibold">No projects found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjust your filters or create a new project to get started.
          </p>
        </div>
        <Button onClick={onNewProject}>
          <PlusIcon className="size-4 mr-2" /> New Project
        </Button>
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      <button
        onClick={onNewProject}
        className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-primary/10">
          <PlusIcon className="size-5" />
        </span>
        <span className="text-sm font-medium">New project</span>
      </button>
    </section>
  );
}
