"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

export type Project = {
  id: string;
  name: string;
  client: string;
  color: string;
  description: string;
  deadline: string | null;
  tracked: number;
  progress: number;
  access: "Public" | "Private";
  status: "Active" | "Inactive";
  headId?: string;
  headName?: string;
  headAvatar?: string;
};

export const columns: ColumnDef<Project>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        className="size-4 cursor-pointer rounded border-border accent-primary"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="size-4 cursor-pointer rounded border-border accent-primary"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "sno",
    header: "S.No",
    cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "name",
    header: "Project Name",
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "client",
    header: "Client",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("client")}</span>,
  },
  {
    accessorKey: "tracked",
    header: "Tracked",
    cell: ({ row }) => <span>{row.getValue<number>("tracked")}h</span>,
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const project = row.original;
      if (project.headName) {
        return (
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {project.headAvatar ? (
                <img src={project.headAvatar} alt={project.headName} className="size-full object-cover" />
              ) : (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {project.headName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              )}
            </div>
            <span className="text-sm font-medium">{project.headName}</span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{project.progress}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: "access",
    header: "Access",
    cell: ({ row }) => {
      const access = row.getValue<string>("access");
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          access === "Public"
            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
        }`}>
          {access}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row, table }) => {
      const project = row.original;
      const meta = table.options.meta as { onView?: (project: Project) => void } | undefined;
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => meta?.onView?.(project)}
          className="text-xs"
        >
          View
        </Button>
      );
    },
  },
];
