"use client";

import { ChevronRightIcon, FolderOpenIcon } from "lucide-react";

interface FileBreadcrumbProps {
  breadcrumbs: { id: string | null; name: string }[];
  onNavigate: (index: number) => void;
}

export function FileBreadcrumb({ breadcrumbs, onNavigate }: FileBreadcrumbProps) {
  return (
    <div className="flex items-center gap-1 text-sm flex-wrap">
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.id || "root"} className="flex items-center gap-1">
          {index > 0 && <ChevronRightIcon className="size-3 text-muted-foreground" />}
          <button
            className={`hover:underline ${index === breadcrumbs.length - 1 ? "font-medium" : "text-muted-foreground"}`}
            onClick={() => onNavigate(index)}
          >
            {index === 0 ? <><FolderOpenIcon className="inline size-3 mr-1" />{crumb.name}</> : crumb.name}
          </button>
        </span>
      ))}
    </div>
  );
}
