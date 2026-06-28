"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon, UserXIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ExperienceRow = {
  id: string;
  company?: string;
  title?: string;
  from?: string;
  to?: string;
  description?: string;
  relevant?: boolean;
};

export type EducationRow = {
  id: string;
  institute?: string;
  degree?: string;
  specialization?: string;
  completionDate?: string;
};

export type FileAttachment = {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
};

export type DependentRow = {
  id: string;
  name?: string;
  relationship?: string;
  dob?: string;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department: string;
  designation: string;
  employmentType: string;
  phone: string;
  branchName: string;
  joiningDate: string;
  avatar: string;
  displayId?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  password?: string;
  location?: string;
  shift?: string;
  sourceOfHire?: string;
  currentExperience?: string;
  totalExperience?: string;
  alternateEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  website?: string;
  workExperience?: ExperienceRow[];
  educationDetails?: EducationRow[];
  dependentDetails?: DependentRow[];
  files?: FileAttachment[];
};

export type TerminatedEmployee = Employee & {
  terminateReason: string;
  terminateDate: string;
};

const statusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  online: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-600",
  offline: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-600",
  break: "bg-gray-200 text-gray-700 dark:bg-gray-700/30 dark:text-gray-600",
  on_leave: "bg-gray-200 text-gray-700 dark:bg-gray-700/30 dark:text-gray-600",
  terminated: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function getColumns(
  onEdit: ((emp: Employee) => void) | undefined,
  onTerminate: (emp: Employee) => void,
): ColumnDef<Employee>[] {
  return [
    {
      id: "avatar",
      header: "",
      cell: ({ row }) => {
        const emp = row.original;
        return (
          <div className="size-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {emp.avatar ? (
              <img src={emp.avatar} alt={emp.name} className="size-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        );
      },
      enableSorting: false,
      size: 40,
    },
    {
      accessorKey: "displayId",
      header: "ID",
      cell: ({ row }) => <span className="font-mono text-muted-foreground text-xs">{row.getValue("displayId") || "—"}</span>,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("email")}</span>,
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => {
        const val = row.getValue("department") as string;
        return val ? <Badge variant="secondary">{val}</Badge> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "designation",
      header: "Designation",
      cell: ({ row }) => {
        const val = row.getValue("designation") as string;
        return val || <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.getValue("role") as string}</Badge>,
    },
    {
      accessorKey: "employmentType",
      header: "Type",
      cell: ({ row }) => {
        const val = row.getValue("employmentType") as string;
        return val ? <span className="text-sm">{val}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "branchName",
      header: "Branch",
      cell: ({ row }) => {
        const val = row.getValue("branchName") as string;
        return val || <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "joiningDate",
      header: "Joined",
      cell: ({ row }) => {
        const val = row.getValue("joiningDate") as string;
        if (!val) return <span className="text-muted-foreground">—</span>;
        try {
          return <span className="text-sm">{new Date(val).toLocaleDateString()}</span>;
        } catch {
          return <span className="text-sm">{val}</span>;
        }
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = (row.getValue("status") as string) || "offline";
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[status] || statusColors.offline}`}>
            {status.replace("_", " ")}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const emp = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <>
                  <DropdownMenuItem onClick={() => onEdit(emp)}>
                    <PencilIcon className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => onTerminate(emp)} className="text-destructive">
                <UserXIcon className="mr-2 size-4" />
                Terminate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      size: 40,
    },
  ];
}
