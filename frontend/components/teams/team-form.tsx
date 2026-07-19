"use client";

import {
  UsersIcon, XIcon, Loader2Icon, AlertCircleIcon, CrownIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.department || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.designation || "").toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting && !o) onCancel(); }}>
      <DialogContent className="p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl"><UsersIcon className="size-5" />{editingTeam ? "Edit Team" : "New Team"}</DialogTitle>
          <DialogDescription>{editingTeam ? "Update the team details." : "Create a new team with name, description, head, and members."}</DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="mx-6 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircleIcon className="size-4 shrink-0" />{formError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-5">
          <fieldset className="rounded-xl border p-4 space-y-4">
            <legend className="text-sm font-semibold px-2">Team Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Team Name *</Label>
                <Input id="teamName" placeholder="" value={teamName} onChange={(e) => onTeamNameChange(e.target.value)} disabled={submitting} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Team Head</Label>
                <Select value={teamHeadId} onValueChange={(v) => { const m = members.find((x) => x.userId === v); onTeamHeadChange(v, m?.name || ""); }} disabled={submitting}>
                  <SelectTrigger className="mt-1 border-black"><SelectValue placeholder="" /></SelectTrigger>
                  <SelectContent>
                    {members.filter((m) => m.userId === teamHeadId || !selectedMemberIds.includes(m.userId)).map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        <div className="flex items-center gap-2">
                          <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium">{getInitials(m.name)}</div>
                          <span>{m.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea id="teamDescription" placeholder="" value={teamDescription} onChange={(e) => onTeamDescriptionChange(e.target.value)} disabled={submitting} rows={2} className="mt-1" />
            </div>
          </fieldset>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <UsersIcon className="size-3.5" />Team Members
                {selectedMemberIds.length > 0 && <span className="ml-1 text-[10px] font-normal text-primary bg-primary/10 rounded-full px-1.5 py-0.5">{selectedMemberIds.length}</span>}
              </h3>
              <div className="flex items-center gap-2">
                <Input placeholder="" value={memberSearch} onChange={(e) => onMemberSearchChange(e.target.value)} className="max-w-[150px] text-xs" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      {selectedMemberIds.length > 0 ? `${selectedMemberIds.length} selected` : "Select members"}<UsersIcon className="ml-1.5 size-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-2" align="end">
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {filteredMembers.filter((m) => !selectedMemberIds.includes(m.userId)).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">{memberSearch ? "No matching members" : "All members already selected"}</p>
                      ) : filteredMembers.filter((m) => !selectedMemberIds.includes(m.userId)).map((m) => {
                        const checked = false;
                        const isLead = m.userId === teamHeadId;
                        return (
                          <label key={m.userId} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted">
                            <Checkbox checked={checked} onCheckedChange={() => { onSelectedMemberIdsChange((prev) => [...prev, m.userId]); }} />
                            <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium shrink-0">{getInitials(m.name)}</div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate flex items-center gap-1">{m.name}{isLead && <span className="text-[9px] text-red-400 font-semibold">(Lead)</span>}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{m.designation}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {selectedMemberIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMemberIds.map((id) => {
                  const m = members.find((x) => x.userId === id);
                  if (!m) return null;
                  const isLead = m.userId === teamHeadId;
                  return (
                    <div key={id} className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs">
                      <div className="size-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {m.avatar ? <img src={m.avatar} alt={m.name} className="size-full object-cover" /> : <span className="text-[9px] font-bold text-muted-foreground">{getInitials(m.name)}</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate max-w-[120px] flex items-center gap-1">{m.name}{isLead && <CrownIcon className="size-3 text-primary shrink-0" />}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{m.email}</p>
                      </div>
                      <button type="button" onClick={() => onSelectedMemberIdsChange((prev) => prev.filter((p) => p !== id))} className="ml-0.5 rounded-full hover:bg-destructive/10 p-0.5 text-muted-foreground hover:text-destructive shrink-0"><XIcon className="size-3" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
          <Button disabled={!teamName.trim() || submitting} onClick={onSubmit}>
            {submitting ? <Loader2Icon className="size-4 animate-spin" /> : editingTeam ? "Save Changes" : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
