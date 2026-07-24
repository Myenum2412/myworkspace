"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { type Team } from "./columns";
import { type OrgMember, type TeamDetail } from "@/components/teams/team-types";
import { TeamList } from "@/components/teams/team-list";
import { TeamForm } from "@/components/teams/team-form";
import { TeamMembers } from "@/components/teams/team-members";


export default function TeamsClient({ teams: initialTeams, members: initialMembers, orgId: initialOrgId }: { teams: Team[]; members: OrgMember[]; orgId?: string }) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [members] = useState<OrgMember[]>(initialMembers);
  const [orgId] = useState(initialOrgId || "");
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamHeadId, setTeamHeadId] = useState("");
  const [teamHeadName, setTeamHeadName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [viewMemberOpen, setViewMemberOpen] = useState(false);
  const [viewMember, setViewMember] = useState<TeamDetail["members"][0] | null>(null);

  const [memberPage, setMemberPage] = useState(0);
  const [memberRowsPerPage, setMemberRowsPerPage] = useState(10);

  const fetchTeams = useCallback(async (oid?: string) => {
    try {
      const query = oid ? `?orgId=${oid}` : "";
      const res = await fetch(`/api/teams${query}`, { credentials: "include" });
      const data = await res.json();
      const result = Array.isArray(data) ? data : data.data || [];
      setTeams(result);
    } catch (error) {
      toast.error("Could not load teams. Please try again.");
    }
  }, []);

  function openCreateForm() {
    setEditingTeam(null);
    setTeamName(""); setTeamDescription(""); setTeamHeadId(""); setTeamHeadName(""); setSelectedMemberIds([]); setFormError("");
    setShowForm(true);
  }

  function openEditForm(team: Team) {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamDescription(team.description);
    setTeamHeadId(team.leadId || "");
    setTeamHeadName(team.leadName || "");
    setSelectedMemberIds(team.memberIds || []);
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!teamName.trim()) return;
    setSubmitting(true);
    setFormError("");

    let hasError = false;

    try {
      if (editingTeam) {
        const res = await fetch(`/api/teams/${editingTeam.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: teamName, description: teamDescription }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setFormError(d.error === "Validation failed" ? "Please fill in all required fields." : (d.error || "Failed to update team"));
          hasError = true;
        }
        if (!hasError) {
          setTeams((prev) => prev.map((t) =>
            t.id === editingTeam.id
              ? { ...t, name: teamName.trim(), description: teamDescription.trim(), leadId: teamHeadId, leadName: teamHeadName, memberIds: selectedMemberIds, memberCount: selectedMemberIds.length }
              : t
          ));
        }
      } else {
        const res = await fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: teamName, description: teamDescription, orgId }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setFormError(d.error === "Validation failed" ? "Please fill in all required fields." : (d.error || "Failed to create team"));
          hasError = true;
        }
        if (!hasError) {
          const data = await res.json().catch(() => ({}));
          const teamId = data?.data?.id || `team_${Date.now()}`;

          const memberIdsToAdd = teamHeadId
            ? selectedMemberIds.includes(teamHeadId) ? selectedMemberIds : [...selectedMemberIds, teamHeadId]
            : selectedMemberIds;

          for (const uid of memberIdsToAdd) {
            try {
              await fetch(`/api/teams/${teamId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userId: uid }),
              });
            } catch (_) {}
          }

          if (teamHeadId) {
            try {
              await fetch(`/api/teams/${teamId}/members/${teamHeadId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ role: "team_lead" }),
              });
            } catch (_) {}
          }

          const newTeam: Team = {
            id: teamId, name: teamName.trim(), description: teamDescription.trim(),
            memberCount: memberIdsToAdd.length, leadName: teamHeadName, leadAvatar: "",
            leadId: teamHeadId, memberIds: memberIdsToAdd, createdAt: new Date().toISOString(),
          };
          setTeams((prev) => [newTeam, ...prev]);
        }
      }
      if (!hasError) {
        setShowForm(false); setEditingTeam(null);
        setTeamName(""); setTeamDescription(""); setTeamHeadId(""); setTeamHeadName(""); setSelectedMemberIds([]);
      }
    } catch {
      setTeams((prev) => {
        if (editingTeam) {
          return prev.map((t) =>
            t.id === editingTeam.id
              ? { ...t, name: teamName.trim(), description: teamDescription.trim(), leadId: teamHeadId, leadName: teamHeadName, memberIds: selectedMemberIds, memberCount: selectedMemberIds.length }
              : t
          );
        }
        const newTeam: Team = {
          id: `team_${Date.now()}`, name: teamName.trim(), description: teamDescription.trim(),
          memberCount: selectedMemberIds.length, leadName: teamHeadName, leadAvatar: "",
          leadId: teamHeadId, memberIds: selectedMemberIds, createdAt: new Date().toISOString(),
        };
        return [newTeam, ...prev];
      });
      setShowForm(false); setEditingTeam(null);
      setTeamName(""); setTeamDescription(""); setTeamHeadId(""); setTeamHeadName(""); setSelectedMemberIds([]);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(teamId: string) {
    if (!confirm("Delete this team? All members will be removed.")) return;
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
        if (selectedTeam?.id === teamId) setSelectedTeam(null);
      }
    } catch (_) {}
  }

  async function openTeamDetail(team: Team) {
    try {
      const res = await fetch(`/api/teams/${team.id}?orgId=${orgId}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const detail = data.data || data;
      setSelectedTeam({
        ...team,
        id: detail.id || team.id,
        name: detail.name || team.name,
        description: detail.description || team.description,
        memberCount: (detail.members || []).length,
        leadName: team.leadName, leadAvatar: team.leadAvatar,
        createdAt: detail.createdAt || team.createdAt,
        members: detail.members || [],
      });
      setMemberPage(0);
    } catch (_) {}
  }

  async function handleAddMember(userId: string) {
    if (!selectedTeam) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, role: "team_staff" }),
      });
      if (res.ok) {
        await openTeamDetail(selectedTeam);
        setShowAddMember(false);
      }
    } catch (_) {} finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members/${userId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) await openTeamDetail(selectedTeam);
    } catch (_) {}
  }

  async function handleSetLead(userId: string) {
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: "team_lead" }),
      });
      if (res.ok) await openTeamDetail(selectedTeam);
    } catch (_) {}
  }

  const totalMembers = teams.reduce((sum, t) => sum + t.memberCount, 0);
  const avgTeamSize = teams.length > 0 ? (totalMembers / teams.length).toFixed(1) : "0";

  return (
    <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      {selectedTeam ? (
        <TeamMembers
          team={selectedTeam}
          members={members}
          tableView={true}
          memberPage={memberPage}
          memberRowsPerPage={memberRowsPerPage}
          onMemberPageChange={setMemberPage}
          onMemberRowsPerPageChange={setMemberRowsPerPage}
          onBack={() => setSelectedTeam(null)}
          onDelete={handleDelete}
          showAddMember={showAddMember}
          onShowAddMemberChange={setShowAddMember}
          addingMember={addingMember}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onSetLead={handleSetLead}
          viewMemberOpen={viewMemberOpen}
          onViewMemberOpenChange={setViewMemberOpen}
          viewMember={viewMember}
          onViewMemberChange={setViewMember}
        />
      ) : (
        <TeamList
          teams={teams}
          onCreateTeam={openCreateForm}
          onViewTeam={openTeamDetail}
          onEditTeam={openEditForm}
          onDeleteTeam={handleDelete}
        />
      )}

      <TeamForm
        open={showForm}
        editingTeam={editingTeam}
        teamName={teamName}
        onTeamNameChange={setTeamName}
        teamDescription={teamDescription}
        onTeamDescriptionChange={setTeamDescription}
        teamHeadId={teamHeadId}
        onTeamHeadChange={(id, name) => { setTeamHeadId(id); setTeamHeadName(name); }}
        selectedMemberIds={selectedMemberIds}
        onSelectedMemberIdsChange={setSelectedMemberIds}
        memberSearch={memberSearch}
        onMemberSearchChange={setMemberSearch}
        submitting={submitting}
        formError={formError}
        onSubmit={handleSubmit}
        onCancel={() => { setShowForm(false); setMemberSearch(""); }}
        members={members}
      />
    </main>
  );
}
