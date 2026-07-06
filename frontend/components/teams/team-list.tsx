"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  UsersIcon, PlusIcon, UserPlusIcon,
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
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-sm text-muted-foreground">Manage your organization's teams</p>
        </div>
        <Button onClick={onCreateTeam}><PlusIcon className="mr-2 size-4" />New Team</Button>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <TeamStatsCard icon={<UsersIcon className="size-4" />} label="Total Teams" value={teams.length} />
        <TeamStatsCard icon={<UserPlusIcon className="size-4" />} label="Total Members" value={totalMembers} valueClassName="text-red-500" />
        <TeamStatsCard icon={<UsersIcon className="size-4" />} label="Avg Team Size" value={avgTeamSize} valueClassName="text-red-500" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Teams</CardTitle></CardHeader>
        <CardContent>
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
            data={teams}
            onRowClick={(team) => onViewTeam(team)}
          />
        </CardContent>
      </Card>
    </>
  );
}
