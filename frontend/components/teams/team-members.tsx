"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UsersIcon, UserPlusIcon, Trash2Icon, XIcon, Loader2Icon, CrownIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { TeamDetail, TeamMember, OrgMember } from "./team-types";
import { getInitials } from "./team-types";

type TeamMembersProps = {
  team: TeamDetail;
  members: OrgMember[];
  tableView: boolean;
  memberPage?: number;
  memberRowsPerPage?: number;
  onMemberPageChange?: (page: number) => void;
  onMemberRowsPerPageChange?: (rowsPerPage: number) => void;
  onBack: () => void;
  onDelete: (teamId: string) => void;
  showAddMember: boolean;
  onShowAddMemberChange: (v: boolean) => void;
  addingMember: boolean;
  onAddMember: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  onSetLead: (userId: string) => void;
  viewMemberOpen: boolean;
  onViewMemberOpenChange: (v: boolean) => void;
  viewMember: TeamMember | null;
  onViewMemberChange: (v: TeamMember | null) => void;
};

export function TeamMembers({
  team, members, tableView,
  memberPage = 0, memberRowsPerPage = 10,
  onMemberPageChange, onMemberRowsPerPageChange,
  onBack, onDelete, showAddMember, onShowAddMemberChange,
  addingMember, onAddMember, onRemoveMember, onSetLead,
  viewMemberOpen, onViewMemberOpenChange, viewMember, onViewMemberChange,
}: TeamMembersProps) {
  const availableMembers = members.filter(
    (m) => !team.members.some((tm) => tm.userId === m.userId)
  );

  const paginatedMembers = tableView
    ? team.members.slice(memberPage * memberRowsPerPage, (memberPage + 1) * memberRowsPerPage)
    : team.members;

  const totalPages = Math.ceil(team.members.length / memberRowsPerPage);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = paginatedMembers.length > 0 && paginatedMembers.every((m) => selectedIds.includes(m.id));
  function toggleSelect(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedMembers.some((m) => m.id === id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...paginatedMembers.map((m) => m.id)])]);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><UsersIcon className="size-6" />{team.name}</h1>
            {team.description && <p className="text-sm text-muted-foreground mt-0.5">{team.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{team.members.length} members</Badge>
          <Button variant="outline" size="sm" onClick={() => onShowAddMemberChange(true)}><UserPlusIcon className="mr-2 size-4" />Add Member</Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(team.id)}><Trash2Icon className="mr-2 size-4" />Delete Team</Button>
        </div>
      </div>

      {tableView ? (
        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col rounded-lg" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="table-premium w-full text-sm text-left" style={{ minWidth: 900 }}>
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-10 px-2 py-3.5 text-center"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></th>
                  <th className="font-semibold px-4 py-3.5 whitespace-nowrap">Member</th>
                  <th className="font-semibold px-4 py-3.5 whitespace-nowrap">Role</th>
                  <th className="font-semibold px-4 py-3.5 whitespace-nowrap">Department</th>
                  <th className="font-semibold px-4 py-3.5 whitespace-nowrap">Designation</th>
                  <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="bg-white">
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="flex items-center justify-center size-12 rounded-2xl bg-muted">
                          <UsersIcon className="size-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No members yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedMembers.map((m) => (
                    <tr key={m.id} className="group bg-white hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { onViewMemberChange(m); onViewMemberOpenChange(true); }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {m.avatar ? (
                            <img src={m.avatar} alt={m.name} className="size-8 rounded-full object-cover ring-2 ring-background" />
                          ) : (
                            <div className="size-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gray-100 text-gray-600">
                              {getInitials(m.name)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{m.name}</span>
                              {m.role === "team_lead" && <Badge className="bg-gray-700 text-gray-700 text-[10px] px-1.5 py-0"><CrownIcon className="size-3 mr-0.5" /> Lead</Badge>}
                            </div>
                            <span className="text-xs text-gray-500 block mt-0.5">{m.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 capitalize">{m.role}</td>
                      <td className="px-4 py-3 text-gray-700">{m.department || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{m.designation || "—"}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {m.role !== "team_lead" && (
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => onSetLead(m.userId)}>
                              <CrownIcon className="size-3 mr-1" /> Set Lead
                            </Button>
                          )}
                          <Button variant="destructive" size="sm" className="text-xs bg-red-500 hover:bg-red-600 text-white" onClick={() => onRemoveMember(m.userId)}>
                            <Trash2Icon className="size-3 mr-1" /> Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>


        </div>
      ) : (
        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col rounded-lg" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="overflow-y-auto flex-1">
            {team.members.length === 0 ? (
              <div className="py-8 text-center"><UsersIcon className="size-10 mx-auto text-muted-foreground/30 mb-2" /><p className="text-sm text-muted-foreground">No members yet.</p></div>
            ) : (
              <div className="space-y-2 p-4">
                {team.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-sm border p-3 cursor-pointer hover:bg-blue-50/50 transition-colors" onClick={() => { onViewMemberChange(m); onViewMemberOpenChange(true); }}>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {m.avatar ? <img src={m.avatar} alt={m.name} className="size-full object-cover" /> : <span className="text-xs font-medium text-muted-foreground">{getInitials(m.name)}</span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{m.name}</span>
                          {m.role === "team_lead" && <Badge className="bg-gray-700 text-gray-700 text-[10px] px-1.5 py-0"><CrownIcon className="size-3 mr-0.5" /> Lead</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.email}{m.department ? ` · ${m.department}` : ""}{m.designation ? ` · ${m.designation}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {m.role !== "team_lead" && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); onSetLead(m.userId); }}><CrownIcon className="size-3 mr-1" />Set Lead</Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onRemoveMember(m.userId); }}><Trash2Icon className="size-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onShowAddMemberChange(false)}>
          <div className="w-full max-w-md rounded-sm bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Add Member to {team.name}</h2>
              <button onClick={() => onShowAddMemberChange(false)} className="rounded-sm p-1 hover:bg-muted"><XIcon className="size-4" /></button>
            </div>
            {availableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All org members are already in this team.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {availableMembers.map((m) => (
                  <button key={m.userId} className="w-full flex items-center gap-3 rounded-sm p-2 hover:bg-muted transition-colors text-left" disabled={addingMember} onClick={() => onAddMember(m.userId)}>
                    <div className="size-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {m.avatar ? <img src={m.avatar} alt={m.name} className="size-full object-cover" /> : <span className="text-[10px] font-medium text-muted-foreground">{getInitials(m.name)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                    {addingMember ? <Loader2Icon className="size-4 animate-spin" /> : <UserPlusIcon className="size-4 text-muted-foreground" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={viewMemberOpen} onOpenChange={(o) => { if (!o) { onViewMemberOpenChange(false); onViewMemberChange(null); } }}>
        <DialogContent className="p-0 flex flex-col">
          {viewMember && (
            <>
              <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-xl"><UsersIcon className="size-5" />{viewMember.name}</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="capitalize text-xs bg-muted rounded-2xl px-2.5 py-0.5">{viewMember.role}</span>
                    {viewMember.department && <span className="text-xs text-muted-foreground">{viewMember.department}</span>}
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-3 space-y-5">
                <div className="flex gap-6 items-start">
                  <div className="size-20 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-border">
                    {viewMember.avatar ? <img src={viewMember.avatar} alt={viewMember.name} className="size-full object-cover" /> : <span className="text-lg font-bold text-muted-foreground">{getInitials(viewMember.name)}</span>}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="rounded-sm border bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">Name</p><p className="text-sm font-medium mt-0.5">{viewMember.name}</p></div>
                    <div className="rounded-sm border bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">Email</p><p className="text-sm font-medium mt-0.5">{viewMember.email}</p></div>
                    <div className="rounded-sm border bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">Role</p><p className="text-sm font-medium mt-0.5 capitalize">{viewMember.role}</p></div>
                    <div className="rounded-sm border bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">Department</p><p className="text-sm font-medium mt-0.5">{viewMember.department || "—"}</p></div>
                    <div className="rounded-sm border bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">Designation</p><p className="text-sm font-medium mt-0.5">{viewMember.designation || "—"}</p></div>
                    <div className="rounded-sm border bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">Status</p><p className="text-sm font-medium mt-0.5 capitalize">{viewMember.status || "—"}</p></div>
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2">
                <Button variant="outline" onClick={() => { onViewMemberOpenChange(false); onViewMemberChange(null); }}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
