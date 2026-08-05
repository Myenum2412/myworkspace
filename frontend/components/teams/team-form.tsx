"use client";

import { useState } from "react";
import {
  UsersIcon, XIcon, Loader2Icon, AlertCircleIcon, CrownIcon, SearchIcon, UserPlusIcon,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Team } from "@/app/teams/columns";
import { type OrgMember, getInitials } from "./team-types";

type TeamFormProps = {
  open: boolean;
  editingTeam: Team | null;
  teamName: string;
  onTeamNameChange: (v: string) => void;
  teamDescription: string;
  onTeamDescriptionChange: (v: string) => void;
  teamHeadId: string;
  onTeamHeadChange: (id: string, name: string) => void;
  selectedMemberIds: string[];
  onSelectedMemberIdsChange: React.Dispatch<React.SetStateAction<string[]>>;
  memberSearch: string;
  onMemberSearchChange: (v: string) => void;
  submitting: boolean;
  formError: string;
  onSubmit: () => void;
  onCancel: () => void;
  members: OrgMember[];
};

export function TeamForm({
  open, editingTeam, teamName, onTeamNameChange,
  teamDescription, onTeamDescriptionChange, teamHeadId, onTeamHeadChange,
  selectedMemberIds, onSelectedMemberIdsChange, memberSearch, onMemberSearchChange,
  submitting, formError, onSubmit, onCancel, members,
}: TeamFormProps) {
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.department || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.designation || "").toLowerCase().includes(memberSearch.toLowerCase())
  );

  const availableMembers = filteredMembers.filter((m) => !selectedMemberIds.includes(m.userId));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-[95vw] h-[95vh] bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 flex items-center justify-center bg-primary/10">
              <UsersIcon className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{editingTeam ? "Edit Team" : "New Team"}</h2>
              <p className="text-sm text-muted-foreground">
                {editingTeam ? "Update the team details." : "Create a new team with name, description, head, and members."}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} disabled={submitting}>
            <XIcon className="size-5" />
          </Button>
        </div>

        {formError && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircleIcon className="size-4 shrink-0" />{formError}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 [&_input]:border-black [&_input]:bg-white [&_select>button]:border-black [&_select>button]:bg-white [&_textarea]:border-black [&_textarea]:bg-white">
          {/* Team Information */}
          <fieldset className="border p-6 space-y-5">
            <legend className="text-sm font-semibold px-2">Team Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <Label className="text-xs text-muted-foreground">Team Name *</Label>
                <Input
                  placeholder="Enter team name"
                  value={teamName}
                  onChange={(e) => onTeamNameChange(e.target.value)}
                  disabled={submitting}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Team Head</Label>
                <Select value={teamHeadId} onValueChange={(v) => { const m = members.find((x) => x.userId === v); onTeamHeadChange(v, m?.name || ""); }} disabled={submitting}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select team head" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        <div className="flex items-center gap-2">
                          <div className="size-5 flex items-center justify-center bg-muted text-[9px] font-medium">{getInitials(m.name)}</div>
                          <span>{m.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Department</Label>
                <Select disabled={submitting}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                placeholder="Describe the team's purpose and goals"
                value={teamDescription}
                onChange={(e) => onTeamDescriptionChange(e.target.value)}
                disabled={submitting}
                rows={3}
                className="mt-1"
              />
            </div>
          </fieldset>

          {/* Team Members */}
          <fieldset className="border p-6 space-y-4">
            <legend className="text-sm font-semibold px-2">Team Members</legend>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? "s" : ""} selected
              </p>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={(e) => onMemberSearchChange(e.target.value)}
                    className="pl-9 w-56 h-9 text-sm bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMemberPickerOpen(!memberPickerOpen)}
                  className="h-9"
                >
                  <UserPlusIcon className="mr-2 size-4" />
                  Add Members
                </Button>
              </div>
            </div>

            {/* Member picker */}
            {memberPickerOpen && (
              <div className="border p-3 max-h-48 overflow-y-auto space-y-1">
                {availableMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {memberSearch ? "No matching members" : "All members already selected"}
                  </p>
                ) : availableMembers.map((m) => {
                  const isLead = m.userId === teamHeadId;
                  return (
                    <label key={m.userId} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                      <div
                        className="size-8 flex items-center justify-center bg-muted text-xs font-medium shrink-0 cursor-pointer"
                        onClick={() => { onSelectedMemberIdsChange((prev) => [...prev, m.userId]); }}
                      >
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} className="size-full object-cover" />
                        ) : getInitials(m.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate flex items-center gap-1">
                          {m.name}{isLead && <CrownIcon className="size-3 text-primary shrink-0" />}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{m.designation || m.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => { onSelectedMemberIdsChange((prev) => [...prev, m.userId]); }}
                      >
                        + Add
                      </Button>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Selected members list */}
            {selectedMemberIds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {selectedMemberIds.map((id) => {
                  const m = members.find((x) => x.userId === id);
                  if (!m) return null;
                  const isLead = m.userId === teamHeadId;
                  return (
                    <div key={id} className="flex items-center gap-3 border px-3 py-2">
                      <div className="size-9 flex items-center justify-center bg-muted overflow-hidden shrink-0">
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} className="size-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">{getInitials(m.name)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate flex items-center gap-1">
                          {m.name}{isLead && <CrownIcon className="size-3.5 text-primary shrink-0" />}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      </div>
                      {isLead ? (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5">Lead</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectedMemberIdsChange((prev) => prev.filter((p) => p !== id))}
                          className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <UsersIcon className="size-10 mb-2 text-muted-foreground/30" />
                <p className="text-sm">No members selected yet.</p>
                <p className="text-xs">Click &ldquo;Add Members&rdquo; to add team members.</p>
              </div>
            )}
          </fieldset>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 shrink-0">
          <Button variant="outline" onClick={onCancel} disabled={submitting} className="w-32 h-10">
            Cancel
          </Button>
          <Button disabled={!teamName.trim() || submitting} onClick={onSubmit} className="w-32 h-10">
            {submitting ? <Loader2Icon className="animate-spin" /> : editingTeam ? "Save Changes" : "Create Team"}
          </Button>
        </div>
      </div>
    </div>
  );
}
