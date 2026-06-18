"use client";

import { ColumnDef } from "@tanstack/react-table";

export type Client = {
  id: string;
  name: string;
  email: string;
  company: string;
  projects: number;
  status: "Active" | "Inactive";
};

export const columns: ColumnDef<Client>[] = [
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
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("email")}</span>,
  },
  {
    accessorKey: "company",
    header: "Company",
    cell: ({ row }) => <span>{row.getValue("company")}</span>,
  },
  {
    accessorKey: "projects",
    header: "Projects",
    cell: ({ row }) => <span>{row.getValue<number>("projects")}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue<string>("status");
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          status === "Active"
            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
        }`}>
          {status}
        </span>
      );
    },
  },
];
