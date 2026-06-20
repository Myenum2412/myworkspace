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
        <SelectTrigger className="h-9 bg-background/50">
          <SelectValue placeholder="Select priority" />
        </SelectTrigger>
        <SelectContent>
          {priorities.map((p) => (
            <SelectItem key={p.id} value={p.name}>
              <div className="flex items-center gap-2 capitalize">{p.name}</div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        onClick={() => onSelect("quick-add")}
        className="text-xs text-primary hover:underline flex items-center gap-1"
      >
        <PlusIcon className="size-3" /> Add new
      </button>
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
}: {
  selectedAssignee: string | null;
  selectedAssigneeType: AssigneeType | null;
  employees: Array<{ id: string; name: string; role: string }>;
  teams: Array<{ id: string; name: string; memberCount: number }>;
  onSelect: (id: string, type: string) => void;
  onRemove: () => void;
  onQuickAdd?: (type: "staff" | "team") => void;
}) {
  const [mode, setMode] = useState<"staff" | "team">("staff");

  const selectedName = selectedAssigneeType === "staff"
    ? employees.find((e) => e.id === selectedAssignee)?.name
    : teams.find((t) => t.id === selectedAssignee)?.name;

  return (
    <div className="space-y-2">
      {/* Toggle: Staff / Team */}
      <div className="flex gap-1 p-0.5 rounded-lg bg-muted/60">
        <button
          type="button"
          onClick={() => setMode("staff")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-md transition-all duration-200",
            mode === "staff"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <UserIcon className="size-3.5" />
          Staff
        </button>
        <button
          type="button"
          onClick={() => setMode("team")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-md transition-all duration-200",
            mode === "team"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <UsersIcon className="size-3.5" />
          Team
        </button>
      </div>

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
          {mode === "staff" ? (
            <Select onValueChange={(val) => onSelect(val, "staff")}>
              <SelectTrigger className="h-9 bg-background/50">
                <SelectValue placeholder="Select staff member..." />
              </SelectTrigger>
              <SelectContent>
                {employees.length === 0 ? (
                  <SelectItem value="" disabled>No staff available</SelectItem>
                ) : (
                  employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}{e.role ? ` (${e.role})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          ) : (
            <Select onValueChange={(val) => onSelect(val, "team")}>
              <SelectTrigger className="h-9 bg-background/50">
                <SelectValue placeholder="Select team..." />
              </SelectTrigger>
              <SelectContent>
                {teams.length === 0 ? (
                  <SelectItem value="" disabled>No teams available</SelectItem>
                ) : (
                  teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.memberCount} members)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          {onQuickAdd && (
            <button
              type="button"
              onClick={() => onQuickAdd(mode)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <PlusIcon className="size-3" /> Quick add {mode}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
