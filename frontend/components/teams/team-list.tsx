"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UsersIcon, PlusIcon, SearchIcon, XIcon,
  MoreHorizontalIcon, PencilIcon, Trash2Icon,
} from "@/lib/icons";
import { DeleteConfirmDialog } from "@/components/dialog-03";
import { PageHeader } from "@/components/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Team } from "@/app/teams/columns";
import { DataTable } from "@/app/teams/data-table";
import { columns } from "@/app/teams/columns";

type TeamListProps = {
  teams: Team[];
  onCreateTeam: () => void;
  onViewTeam: (team: Team) => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
};

export function TeamList({
  teams,
  onCreateTeam, onViewTeam, onEditTeam, onDeleteTeam,
}: TeamListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q) ||
      (t.leadName || "").toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  return (
    <>
      <PageHeader
        className="mb-4 sm:mb-6"
        icon={<UsersIcon className="size-6" />}
        title={<h1>Teams</h1>}
        subtitle={<p>Manage your team members and their roles</p>}
        search={
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        }
        actions={
          <Button onClick={onCreateTeam} className="shrink-0 touch-target"><PlusIcon className="size-4" />New Team</Button>
        }
      />

      <DataTable
            columns={columns.map((col) => ({
              ...col,
              cell: col.id === "actions"
                ? ({ row }: { row: { original: Team } }) => {
                    const team = row.original;
                    return (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon className="" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onViewTeam(team); }}><UsersIcon className="mr-2 size-4" />View Members</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEditTeam(team); }}><PencilIcon className="mr-2 size-4" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DeleteConfirmDialog
                            title="Delete Team"
                            description="Are you sure you want to delete this team? All members will be removed. This action cannot be undone."
                            onConfirm={() => onDeleteTeam(team.id)}
                          >
                            <DropdownMenuItem className="text-destructive"><Trash2Icon className="mr-2 size-4" />Delete</DropdownMenuItem>
                          </DeleteConfirmDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }
                : col.cell,
            }))}
            data={filteredTeams}
            onRowClick={(team) => onViewTeam(team)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            hideSearchBar
      />
    </>
  );
}
