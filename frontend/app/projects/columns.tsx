import { ColumnDef, Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import FolderIcon from "@mui/icons-material/Folder";
import { PaletteIcon, TextIcon, CalendarIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon, EyeIcon, AlertCircleIcon, ClockIcon } from "lucide-react";
import type { Project } from "@/components/projects/project-types";

function getProjectDueStatus(project: Project): "overdue" | "due-soon" | "normal" {
  if (!project.deadline) return "normal";
  if (project.status !== "Active" || project.progress >= 100) return "normal";
  const now = new Date();
  const due = new Date(project.deadline);
  const diffMs = due.getTime() - now.getTime();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 24 * 60 * 60 * 1000) return "due-soon";
  return "normal";
}

export const columns: ColumnDef<Project>[] = [
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
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("client") || "—"}</span>,
  },
  {
    id: "color",
    header: () => <span className="flex items-center gap-1"><PaletteIcon className="size-3" /> Color</span>,
    cell: ({ row }) => {
      const color = row.original.color;
      return color
        ? <span className="inline-block size-5 rounded-sm border" style={{ backgroundColor: color }} title={color} />
        : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue<string>("priority") || "medium";
      const colors: Record<string, string> = {
        low: "bg-slate-100 text-slate-600",
        medium: "bg-blue-100 text-blue-600",
        high: "bg-amber-100 text-amber-600",
        critical: "bg-red-100 text-red-600",
      };
      return (
        <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-medium ${colors[priority] || colors.medium}`}>
          {priority === "critical" || priority === "high" ? <AlertCircleIcon className="size-2.5" /> : null}
          {priority}
        </span>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.getValue<string>("category");
      return category
        ? <span className="text-xs capitalize text-muted-foreground">{category}</span>
        : <span className="text-muted-foreground">\u2014</span>;
    },
  },
  {
    id: "description",
    header: () => <span className="flex items-center gap-1"><TextIcon className="size-3" /> Description</span>,
    cell: ({ row }) => {
      const desc = row.original.description;
      return <span className="text-muted-foreground truncate max-w-[200px] block" title={desc}>{desc || "—"}</span>;
    },
  },
  {
    id: "deadline",
    header: () => <span className="flex items-center gap-1"><CalendarIcon className="size-3" /> Deadline</span>,
    cell: ({ row }) => {
      const project = row.original;
      const dueStatus = getProjectDueStatus(project);
      return project.deadline ? (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{new Date(project.deadline).toLocaleDateString()}</span>
          {dueStatus === "overdue" && (
            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0 gap-1">
              <AlertCircleIcon className="size-3" /> Overdue
            </Badge>
          )}
          {dueStatus === "due-soon" && (
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px] px-1.5 py-0 gap-1">
              <ClockIcon className="size-3" /> Due Soon
            </Badge>
          )}
        </div>
      ) : <span className="text-muted-foreground">—</span>;
    },
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
            <div className="size-7 rounded-2xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
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
          <div className="h-2 w-20 rounded-sm bg-muted">
            <div
              className="h-2 rounded-sm bg-primary transition-all"
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
        <span className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-medium ${
          access === "Public"
            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-600"
        }`}>
          {access}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue<string>("status");
      const active = status === "Active";
      return (
        <span className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-medium ${
          active
            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-600"
        }`}>
          {status}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row, table }) => {
      const project = row.original;
      const meta = table.options.meta as { onView?: (project: Project) => void; onEdit?: (project: Project) => void; onDelete?: (project: Project) => void } | undefined;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => meta?.onView?.(project)}>
              <EyeIcon className="size-3.5 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => meta?.onEdit?.(project)}>
              <PencilIcon className="size-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => meta?.onDelete?.(project)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2Icon className="size-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
