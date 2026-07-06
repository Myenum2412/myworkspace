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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">On Going Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {projects.filter((p) => p.progress > 0 && p.progress < 100).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">In Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {projects.filter((p) => p.progress === 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {projects.filter((p) => p.progress === 100).length}
            </div>
          </CardContent>
        </Card>
      </div>

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
