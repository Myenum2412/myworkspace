"use client";

import * as React from "react";
import { useState } from "react";
import { XIcon, PlusIcon, UsersIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";

export type AssigneeType = "staff" | "team";

export function PrioritySelector({
  selectedPriority,
  priorities,
  onSelect,
}: {
  selectedPriority: string;
  priorities: Array<{ id: string; name: string }>;
  onSelect: (val: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Select value={selectedPriority} onValueChange={onSelect}>
        <SelectTrigger className="bg-background/50">
          <SelectValue placeholder="" />
        </SelectTrigger>
        <SelectContent>
          {priorities.map((p) => (
            <SelectItem key={p.id} value={p.name}>
              <div className="flex items-center gap-2 capitalize">{p.name}</div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AssigneeSelector({
  selectedAssignee,
  selectedAssigneeType,
  employees,
  teams,
  onSelect,
  onRemove,
  onQuickAdd,
  showTeamAsAssignee = false,
}: {
  selectedAssignee: string | null;
  selectedAssigneeType: AssigneeType | null;
  employees: Array<{ id: string; name: string; role: string }>;
  teams: Array<{ id: string; name: string; memberCount: number }>;
  onSelect: (id: string, type: string) => void;
  onRemove: () => void;
  onQuickAdd?: (type: "staff" | "team") => void;
  showTeamAsAssignee?: boolean;
}) {
  const [mode, setMode] = useState<"staff" | "team">(showTeamAsAssignee ? "team" : "staff");

  React.useEffect(() => {
    setMode(showTeamAsAssignee ? "team" : "staff");
  }, [showTeamAsAssignee]);

  const selectedName = selectedAssigneeType === "staff"
    ? employees.find((e) => e.id === selectedAssignee)?.name
    : teams.find((t) => t.id === selectedAssignee)?.name;

  return (
    <div className="space-y-2">

      {selectedAssignee && selectedName ? (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="capitalize px-2.5 py-1">
            {selectedAssigneeType === "staff" ? <UserIcon className="size-3 mr-1" /> : <UsersIcon className="size-3 mr-1" />}
            {selectedName}
          </Badge>
          <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors">
            <XIcon className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <Select onValueChange={(val) => {
            const type = val.startsWith("team_") ? "team" : "staff";
            const id = val.replace(/^(team_|staff_)/, "");
            onSelect(id, type);
          }}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <SelectContent>
              {!showTeamAsAssignee && (
                <SelectGroup>
                  <SelectLabel>Staff</SelectLabel>
                  {employees.length === 0 ? (
                    <SelectItem value="no_staff" disabled>No staff available</SelectItem>
                  ) : (
                    employees.map((e) => (
                      <SelectItem key={`staff_${e.id}`} value={`staff_${e.id}`}>
                        {e.name}{e.role ? ` (${e.role})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectGroup>
              )}
              {showTeamAsAssignee && (
                <SelectGroup>
                  <SelectLabel>Teams</SelectLabel>
                  {teams.length === 0 ? (
                    <SelectItem value="no_teams" disabled>No teams available</SelectItem>
                  ) : (
                    teams.map((t) => (
                      <SelectItem key={`team_${t.id}`} value={`team_${t.id}`}>
                        {t.name} ({t.memberCount} members)
                      </SelectItem>
                    ))
                  )}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
