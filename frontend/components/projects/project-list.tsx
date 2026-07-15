"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2Icon } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { columns } from "@/app/projects/columns";
import type { ProjectListProps } from "./project-types";

export default function ProjectList({
  projects,
  loading,
  onView,
  onEdit,
  onDelete,
  onNewProject,
}: ProjectListProps) {
  return (
    <>
      <h1 className="text-2xl font-bold">All Projects</h1>

      <div className="flex-1 mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={projects}
            meta={{ onView, onEdit, onDelete } as Record<string, unknown>}
            onRowClick={(p) => onView(p)}
          />
        )}
      </div>
    </>
  );
}
