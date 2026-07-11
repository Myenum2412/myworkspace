"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UsersIcon, PlusIcon, UserPlusIcon, SearchIcon, XIcon,
  MoreHorizontalIcon, PencilIcon, Trash2Icon,
} from "lucide-react";
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
import { TeamStatsCard } from "./team-card";

type TeamListProps = {
  teams: Team[];
  totalMembers: number;
  avgTeamSize: string;
  onCreateTeam: () => void;
  onViewTeam: (team: Team) => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
};

export function TeamList({
  teams, totalMembers, avgTeamSize,
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
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="min-w-0 shrink-0">
          <h1 className="text-xl font-bold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground">{filteredTeams.length} team(s)</p>
        </div>

        <div className="relative w-full max-w-md mx-auto px-4 hidden sm:block">
          <SearchIcon className="absolute left-7 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <XIcon className="size-4" />
            </button>
          )}
        </div>

        <Button onClick={onCreateTeam} className="shrink-0"><PlusIcon className="mr-2 size-4" />New Team</Button>
      </div>

      {/* Search (mobile) */}
      <div className="relative w-full mb-4 sm:hidden">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 w-full"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <TeamStatsCard icon={<UsersIcon className="size-4" />} label="Total Teams" value={teams.length} />
        <TeamStatsCard icon={<UserPlusIcon className="size-4" />} label="Total Members" value={totalMembers} valueClassName="text-red-500" />
        <TeamStatsCard icon={<UsersIcon className="size-4" />} label="Avg Team Size" value={avgTeamSize} valueClassName="text-red-500" />
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns.map((col) => ({
              ...col,
              cell: col.id === "actions"
                ? ({ row }: { row: { original: Team } }) => {
                    const team = row.original;
                    return (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onViewTeam(team); }}><UsersIcon className="mr-2 size-4" />View Members</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEditTeam(team); }}><PencilIcon className="mr-2 size-4" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDeleteTeam(team.id); }}><Trash2Icon className="mr-2 size-4" />Delete</DropdownMenuItem>
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
        </CardContent>
      </Card>
    </>
  );
}
