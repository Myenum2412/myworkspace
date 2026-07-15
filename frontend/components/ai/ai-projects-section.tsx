"use client";

import { useState, useEffect } from "react";
import { FolderKanban, Loader2 } from "lucide-react";

interface Project {
  name: string;
  _id: string;
}

interface AiProjectsSectionProps {
  onSelectProject: (projectName: string) => void;
}

export function AiProjectsSection({ onSelectProject }: AiProjectsSectionProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects-list", { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        setProjects(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        setProjects([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-4 text-xs text-muted-foreground">
        <FolderKanban className="h-8 w-8 text-muted-foreground/40" />
        <span>No projects found</span>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {projects.map((project) => (
        <button
          key={project._id || project.name}
          onClick={() => onSelectProject(project.name)}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors text-left"
        >
          <FolderKanban className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="truncate">{project.name}</span>
        </button>
      ))}
    </div>
  );
}
