"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon, UsersIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Team = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  leadName: string;
  leadAvatar: string;
  createdAt: string;
};

export const columns: ColumnDef<Team>[] = [
  {
    id: "avatar",
    header: "",
    cell: ({ row }) => {
      const team = row.original;
      return (
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {team.leadAvatar ? (
            <img src={team.leadAvatar} alt={team.leadName} className="size-full object-cover" />
          ) : (
            <UsersIcon className="size-4 text-primary" />
          )}
        </div>
      );
    },
    enableSorting: false,
    size: 40,
  },
  {
    accessorKey: "name",
    header: "Team Name",
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const val = row.getValue("description") as string;
      return val ? <span className="text-muted-foreground text-sm">{val}</span> : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "leadName",
    header: "Team Lead",
    cell: ({ row }) => {
      const val = row.getValue("leadName") as string;
      return val ? <span className="text-sm">{val}</span> : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "memberCount",
    header: "Members",
    cell: ({ row }) => {
      const count = row.getValue("memberCount") as number;
      return <Badge variant="secondary">{count} member{count !== 1 ? "s" : ""}</Badge>;
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const val = row.getValue("createdAt") as string;
      if (!val) return <span className="text-muted-foreground">—</span>;
      try {
        return <span className="text-sm text-muted-foreground">{new Date(val).toLocaleDateString()}</span>;
      } catch {
        return <span className="text-sm">{val}</span>;
      }
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const team = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => (window.location.href = `/teams/${team.id}`)}>
              <PencilIcon className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2Icon className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    size: 40,
  },
];
