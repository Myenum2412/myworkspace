"use client";

import { buildProjectColumns } from "@/app/projects/columns";
import { DataTable } from "@/components/data-table";
import { useIndustry } from "@/components/industry-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2Icon } from "@/lib/icons";
import type { ProjectListProps } from "./project-types";

export default function ProjectList({
  projects,
  loading,
  onView,
  onEdit,
  onDelete,
  onNewProject,
}: ProjectListProps) {
  const { t } = useIndustry();
  const columns = buildProjectColumns(t);
  return (
    <>
      <div className="flex-1">
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
            hideSearchBar
          />
        )}
      </div>
    </>
  );
}
