"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  UsersIcon,
  PlusIcon,
  XIcon,
  Loader2Icon,
  AlertCircleIcon,
  UserPlusIcon,
  CrownIcon,
  Trash2Icon,
  PencilIcon,
  MoreHorizontalIcon,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { columns, type Team } from "./columns";
import { DataTable } from "./data-table";

const FAKE_TEAMS: Team[] = [
  { id: "team_1", name: "Engineering", description: "Core platform development", memberCount: 8, leadName: "Alice Chen", leadAvatar: "", leadId: "u1", projectManagerIds: ["u2", "u3"], projectManagerNames: "Marcus Lee, Sarah Kim", memberIds: ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"], createdAt: "2025-01-15T00:00:00Z" },
  { id: "team_2", name: "Design", description: "UI/UX and branding", memberCount: 5, leadName: "Marcus Lee", leadAvatar: "", leadId: "u2", projectManagerIds: ["u3"], projectManagerNames: "Sarah Kim", memberIds: ["u2", "u3", "u4", "u5", "u6"], createdAt: "2025-02-10T00:00:00Z" },
  { id: "team_3", name: "Marketing", description: "Growth and communications", memberCount: 6, leadName: "Sarah Kim", leadAvatar: "", leadId: "u3", projectManagerIds: ["u4"], projectManagerNames: "James Wilson", memberIds: ["u3", "u4", "u5", "u6", "u7", "u8"], createdAt: "2025-03-05T00:00:00Z" },
  { id: "team_4", name: "Sales", description: "Enterprise sales and partnerships", memberCount: 4, leadName: "James Wilson", leadAvatar: "", leadId: "u4", projectManagerIds: [], projectManagerNames: "", memberIds: ["u4", "u5", "u6", "u7"], createdAt: "2025-01-20T00:00:00Z" },
  { id: "team_5", name: "QA", description: "Quality assurance and testing", memberCount: 3, leadName: "Priya Patel", leadAvatar: "", leadId: "u5", projectManagerIds: [], projectManagerNames: "", memberIds: ["u5", "u6", "u7"], createdAt: "2025-04-01T00:00:00Z" },
];

const FAKE_ORG_MEMBERS: OrgMember[] = [
  { userId: "u1", name: "Alice Chen", email: "alice@company.com", avatar: "", role: "admin", designation: "Engineering Manager", department: "Engineering" },
  { userId: "u2", name: "Marcus Lee", email: "marcus@company.com", avatar: "", role: "member", designation: "Senior Designer", department: "Design" },
  { userId: "u3", name: "Sarah Kim", email: "sarah@company.com", avatar: "", role: "member", designation: "Marketing Lead", department: "Marketing" },
  { userId: "u4", name: "James Wilson", email: "james@company.com", avatar: "", role: "member", designation: "Sales Director", department: "Sales" },
  { userId: "u5", name: "Priya Patel", email: "priya@company.com", avatar: "", role: "member", designation: "QA Lead", department: "QA" },
  { userId: "u6", name: "Tom Rodriguez", email: "tom@company.com", avatar: "", role: "member", designation: "Full Stack Developer", department: "Engineering" },
  { userId: "u7", name: "Emma Davis", email: "emma@company.com", avatar: "", role: "member", designation: "UX Researcher", department: "Design" },
  { userId: "u8", name: "Lisa Wang", email: "lisa@company.com", avatar: "", role: "member", designation: "Content Strategist", department: "Marketing" },
  { userId: "u9", name: "David Park", email: "david@company.com", avatar: "", role: "member", designation: "Backend Developer", department: "Engineering" },
  { userId: "u10", name: "Maya Johnson", email: "maya@company.com", avatar: "", role: "member", designation: "Data Analyst", department: "Marketing" },
  { userId: "u11", name: "Kevin Brown", email: "kevin@company.com", avatar: "", role: "member", designation: "DevOps Engineer", department: "Engineering" },
  { userId: "u12", name: "Nina Patel", email: "nina@company.com", avatar: "", role: "member", designation: "Product Manager", department: "Product" },
];

type OrgMember = {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  designation?: string;
  department?: string;
};

type TeamDetail = Team & {
  members: {
    id: string;
    userId: string;
    name: string;
    email: string;
    avatar: string;
    status: string;
    department: string;
    designation: string;
    role: string;
  }[];
};

export default function TeamsPage() {
  const { data: session } = useSession();
  const [teams, setTeams] = useState<Team[]>(FAKE_TEAMS);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamHeadId, setTeamHeadId] = useState("");
  const [teamHeadName, setTeamHeadName] = useState("");
  const [projectManagerIds, setProjectManagerIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Team detail / members state
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [viewMemberOpen, setViewMemberOpen] = useState(false);
  const [viewMember, setViewMember] = useState<TeamDetail["members"][0] | null>(null);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  const fetchTeams = useCallback(async () => {
    if (!orgId) {
      setTeams(FAKE_TEAMS);
      return;
    }
    try {
      const res = await fetch(`/api/teams?orgId=${orgId}`, { credentials: "include" });
      const data = await res.json();
      const result = Array.isArray(data) ? data : data.data || [];
      setTeams(result.length > 0 ? result : FAKE_TEAMS);
    } catch {
      setTeams(FAKE_TEAMS);
    }
  }, [orgId]);

  const fetchOrgMembers = useCallback(async () => {
    if (!orgId) {
      setMembers(FAKE_ORG_MEMBERS);
      return;
    }
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, { credentials: "include" });
      const data = await res.json();
      const raw = Array.isArray(data) ? data : data.data || [];
      if (raw.length === 0) {
        setMembers(FAKE_ORG_MEMBERS);
        return;
      }
      setMembers(
        raw.map((m: Record<string, unknown>) => ({
          userId: (m.userId as Record<string, unknown>)?._id?.toString?.() || (m.userId as string) || "",
          name: (m.userId as Record<string, unknown>)?.name as string || "Unknown",
          email: (m.userId as Record<string, unknown>)?.email as string || "",
          avatar: (m.userId as Record<string, unknown>)?.image as string || "",
          role: (m.role as string) || "member",
        }))
      );
    } catch {
      setMembers(FAKE_ORG_MEMBERS);
    }
  }, [orgId]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const id = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (id) {
          setOrgId(id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => {
    if (orgId) {
      setLoading(true);
      fetchTeams().finally(() => setLoading(false));
      fetchOrgMembers();
    }
  }, [orgId, fetchTeams, fetchOrgMembers]);

  function openCreateForm() {
    setEditingTeam(null);
    setTeamName("");
    setTeamDescription("");
    setTeamHeadId("");
    setTeamHeadName("");
    setProjectManagerIds([]);
    setSelectedMemberIds([]);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(team: Team) {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamDescription(team.description);
    setTeamHeadId(team.leadId || "");
    setTeamHeadName(team.leadName || "");
    setProjectManagerIds(team.projectManagerIds || []);
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
          setFormError(d.error || "Failed to update team");
          hasError = true;
        }
        if (!hasError) {
          setTeams((prev) => prev.map((t) =>
            t.id === editingTeam.id
              ? {
                  ...t,
                  name: teamName.trim(),
                  description: teamDescription.trim(),
                  leadId: teamHeadId,
                  leadName: teamHeadName,
                  memberIds: selectedMemberIds,
                  memberCount: selectedMemberIds.length,
                  projectManagerIds,
                  projectManagerNames: members.filter((m) => projectManagerIds.includes(m.userId)).map((m) => m.name).join(", "),
                }
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
          setFormError(d.error || "Failed to create team");
          hasError = true;
        }
        if (!hasError) {
          const data = await res.json().catch(() => ({}));
          const teamId = data?.data?.id || `team_${Date.now()}`;

          const memberIdsToAdd = teamHeadId
            ? selectedMemberIds.includes(teamHeadId)
              ? selectedMemberIds
              : [...selectedMemberIds, teamHeadId]
            : selectedMemberIds;

          for (const uid of memberIdsToAdd) {
            try {
              await fetch(`/api/teams/${teamId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userId: uid }),
              });
            } catch {}
          }

          if (teamHeadId) {
            try {
              await fetch(`/api/teams/${teamId}/members/${teamHeadId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ role: "lead" }),
              });
            } catch {}
          }

          const pmNames = members.filter((m) => projectManagerIds.includes(m.userId)).map((m) => m.name).join(", ");
          const newTeam: Team = {
            id: teamId,
            name: teamName.trim(),
            description: teamDescription.trim(),
            memberCount: memberIdsToAdd.length,
            leadName: teamHeadName,
            leadAvatar: "",
            leadId: teamHeadId,
            memberIds: memberIdsToAdd,
            projectManagerIds,
            projectManagerNames: pmNames,
            createdAt: new Date().toISOString(),
          };
          setTeams((prev) => [newTeam, ...prev]);
        }
      }
      if (!hasError) {
        setShowForm(false);
        setEditingTeam(null);
        setTeamName("");
        setTeamDescription("");
        setTeamHeadId("");
        setTeamHeadName("");
        setProjectManagerIds([]);
        setSelectedMemberIds([]);
      }
    } catch {
        const pmNames = members.filter((m) => projectManagerIds.includes(m.userId)).map((m) => m.name).join(", ");
        setTeams((prev) => {
          if (editingTeam) {
            return prev.map((t) =>
              t.id === editingTeam.id
                ? {
                    ...t,
                    name: teamName.trim(),
                    description: teamDescription.trim(),
                    leadId: teamHeadId,
                    leadName: teamHeadName,
                    memberIds: selectedMemberIds,
                    memberCount: selectedMemberIds.length,
                    projectManagerIds,
                    projectManagerNames: pmNames,
                  }
                : t
            );
          }
          const newTeam: Team = {
            id: `team_${Date.now()}`,
            name: teamName.trim(),
            description: teamDescription.trim(),
            memberCount: selectedMemberIds.length,
            leadName: teamHeadName,
            leadAvatar: "",
            leadId: teamHeadId,
            memberIds: selectedMemberIds,
            projectManagerIds,
            projectManagerNames: pmNames,
            createdAt: new Date().toISOString(),
          };
          return [newTeam, ...prev];
        });
        setShowForm(false);
        setEditingTeam(null);
        setTeamName("");
        setTeamDescription("");
        setTeamHeadId("");
        setTeamHeadName("");
        setProjectManagerIds([]);
        setSelectedMemberIds([]);
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
    } catch {}
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
        leadName: team.leadName,
        leadAvatar: team.leadAvatar,
        createdAt: detail.createdAt || team.createdAt,
        members: detail.members || [],
      });
    } catch {}
  }

  async function handleAddMember(userId: string) {
    if (!selectedTeam) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, role: "member" }),
      });
      if (res.ok) {
        await openTeamDetail(selectedTeam);
        setShowAddMember(false);
      }
    } catch {} finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        await openTeamDetail(selectedTeam);
      }
    } catch {}
  }

  async function handleSetLead(userId: string) {
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: "lead" }),
      });
      if (res.ok) {
        await openTeamDetail(selectedTeam);
      }
    } catch {}
  }

  const totalMembers = teams.reduce((sum, t) => sum + t.memberCount, 0);
  const avgTeamSize = teams.length > 0 ? (totalMembers / teams.length).toFixed(1) : "0";

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.department || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.designation || "").toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Filter out members already in the team
  const availableMembers = selectedTeam
    ? members.filter((m) => !selectedTeam.members.some((tm) => tm.userId === m.userId))
    : members;

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          {selectedTeam ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTeam(null)}>
                    ← Back
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                      <UsersIcon className="size-6" />
                      {selectedTeam.name}
                    </h1>
                    {selectedTeam.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{selectedTeam.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedTeam.members.length} members</Badge>
                  <Button variant="outline" size="sm" onClick={() => setShowAddMember(true)}>
                    <UserPlusIcon className="mr-2 size-4" />
                    Add Member
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedTeam.id)}>
                    <Trash2Icon className="mr-2 size-4" />
                    Delete Team
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTeam.members.length === 0 ? (
                    <div className="py-8 text-center">
                      <UsersIcon className="size-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No members yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedTeam.members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setViewMember(m); setViewMemberOpen(true); }}>
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                              {m.avatar ? (
                                <img src={m.avatar} alt={m.name} className="size-full object-cover" />
                              ) : (
                                <span className="text-xs font-medium text-muted-foreground">
                                  {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{m.name}</span>
                                {m.role === "lead" && (
                                  <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
                                    <CrownIcon className="size-3 mr-0.5" /> Lead
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {m.email}
                                {m.department ? ` · ${m.department}` : ""}
                                {m.designation ? ` · ${m.designation}` : ""}
                              </p>
                  </div>
                  {projectManagerIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {projectManagerIds.map((id) => {
                        const m = members.find((x) => x.userId === id);
                        if (!m) return null;
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium">
                            <span className="size-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold shrink-0">
                              {getInitials(m.name)}
                            </span>
                            {m.name}
                            <button
                              type="button"
                              onClick={() => setProjectManagerIds((prev) => prev.filter((p) => p !== id))}
                              className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5"
                            >
                              <XIcon className="size-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                          <div className="flex items-center gap-1">
                            {m.role !== "lead" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => { e.stopPropagation(); handleSetLead(m.userId); }}
                              >
                                <CrownIcon className="size-3 mr-1" />
                                Set Lead
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleRemoveMember(m.userId); }}
                            >
                              <Trash2Icon className="size-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {showAddMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddMember(false)}>
                  <div className="w-full max-w-md rounded-xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold">Add Member to {selectedTeam.name}</h2>
                      <button onClick={() => setShowAddMember(false)} className="rounded-md p-1 hover:bg-muted">
                        <XIcon className="size-4" />
                      </button>
                    </div>
                    {availableMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">All org members are already in this team.</p>
                    ) : (
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {availableMembers.map((m) => (
                          <button
                            key={m.userId}
                            className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors text-left"
                            disabled={addingMember}
                            onClick={() => handleAddMember(m.userId)}
                          >
                            <div className="size-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                              {m.avatar ? (
                                <img src={m.avatar} alt={m.name} className="size-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-medium text-muted-foreground">
                                  {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{m.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                            </div>
                            {addingMember ? (
                              <Loader2Icon className="size-4 animate-spin" />
                            ) : (
                              <UserPlusIcon className="size-4 text-muted-foreground" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Teams</h1>
                  <p className="text-sm text-muted-foreground">Manage your organization's teams</p>
                </div>
                <Button onClick={openCreateForm}>
                  <PlusIcon className="mr-2 size-4" />
                  New Team
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <UsersIcon className="size-4" /> Total Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{loading ? <Loader2Icon className="size-5 animate-spin" /> : teams.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <UserPlusIcon className="size-4" /> Total Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-500">{loading ? <Loader2Icon className="size-5 animate-spin" /> : totalMembers}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <UsersIcon className="size-4" /> Avg Team Size
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-500">{loading ? <Loader2Icon className="size-5 animate-spin" /> : avgTeamSize}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">All Teams</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <DataTable
                      columns={columns.map((col) => ({
                        ...col,
                        cell: col.id === "actions"
                          ? ({ row }: { row: { original: Team } }) => {
                              const team = row.original;
                              return (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon-sm">
                                      <MoreHorizontalIcon className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); openTeamDetail(team); }}>
                                      <UsersIcon className="mr-2 size-4" />
                                      View Members
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEditForm(team); }}>
                                      <PencilIcon className="mr-2 size-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDelete(team.id); }}>
                                      <Trash2Icon className="mr-2 size-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              );
                            }
                          : col.cell,
                      }))}
                      data={teams}
                      onRowClick={(team) => openTeamDetail(team)}
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}

          <Dialog open={showForm} onOpenChange={(open) => { if (!submitting && !open) { setShowForm(false); setMemberSearch(""); } }}>
            <DialogContent className="p-0 flex flex-col">
              <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <UsersIcon className="size-5" />
                  {editingTeam ? "Edit Team" : "New Team"}
                </DialogTitle>
                <DialogDescription>
                  {editingTeam ? "Update the team details." : "Create a new team with members and leads."}
                </DialogDescription>
              </DialogHeader>

              {formError && (
                <div className="mx-6 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-6 py-3 space-y-5">
                {/* Section: Basic Info */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <UsersIcon className="size-3.5" />
                    Team Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="teamName" className="text-sm">Team Name *</Label>
                      <Input
                        id="teamName"
                        placeholder="e.g. Engineering"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        disabled={submitting}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="teamHead" className="text-sm">Team Lead</Label>
                      <Select
                        value={teamHeadId}
                        onValueChange={(v) => {
                          const m = members.find((x) => x.userId === v);
                          setTeamHeadId(v);
                          setTeamHeadName(m?.name || "");
                        }}
                        disabled={submitting}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select team lead" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((m) => (
                            <SelectItem key={m.userId} value={m.userId}>
                              <div className="flex items-center gap-2">
                                <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium">
                                  {getInitials(m.name)}
                                </div>
                                <span>{m.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="teamDescription" className="text-sm">Description</Label>
                    <Textarea
                      id="teamDescription"
                      placeholder="Brief description of the team"
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      disabled={submitting}
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Separator />

                {/* Section: Project Managers */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <UsersIcon className="size-3.5" />
                      Project Managers
                      {projectManagerIds.length > 0 && (
                        <span className="ml-1 text-[10px] font-normal text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                          {projectManagerIds.length}
                        </span>
                      )}
                    </h3>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          {projectManagerIds.length > 0
                            ? `${projectManagerIds.length} selected`
                            : "Select project managers"}
                          <UsersIcon className="ml-1.5 size-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-2" align="end">
                        <div className="space-y-1 max-h-56 overflow-y-auto">
                          {members.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2 text-center">No employees available</p>
                          ) : members.map((m) => {
                            const checked = projectManagerIds.includes(m.userId);
                            return (
                              <label
                                key={m.userId}
                                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted text-sm"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => {
                                    setProjectManagerIds((prev) =>
                                      checked ? prev.filter((id) => id !== m.userId) : [...prev, m.userId]
                                    );
                                  }}
                                />
                                <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium shrink-0">
                                  {getInitials(m.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{m.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{m.designation}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {projectManagerIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {projectManagerIds.map((id) => {
                        const m = members.find((x) => x.userId === id);
                        if (!m) return null;
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium">
                            <span className="size-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold shrink-0">
                              {getInitials(m.name)}
                            </span>
                            {m.name}
                            <button
                              type="button"
                              onClick={() => setProjectManagerIds((prev) => prev.filter((p) => p !== id))}
                              className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5"
                            >
                              <XIcon className="size-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Section: Team Members */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <UsersIcon className="size-3.5" />
                      Team Members
                      {selectedMemberIds.length > 0 && (
                        <span className="ml-1 text-[10px] font-normal text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                          {selectedMemberIds.length}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Search..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="max-w-[150px] h-7 text-xs"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            {selectedMemberIds.length > 0
                              ? `${selectedMemberIds.length} selected`
                              : "Select members"}
                            <UsersIcon className="ml-1.5 size-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-2" align="end">
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {filteredMembers.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-4 text-center">
                                {memberSearch ? "No matching members" : "No employees available"}
                              </p>
                            ) : filteredMembers.map((m) => {
                              const checked = selectedMemberIds.includes(m.userId);
                              const isLead = m.userId === teamHeadId;
                              return (
                                <label
                                  key={m.userId}
                                  className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${
                                    isLead ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted"
                                  }`}
                                >
                                  <Checkbox
                                    checked={checked}
                                    disabled={isLead}
                                    onCheckedChange={() => {
                                      setSelectedMemberIds((prev) =>
                                        checked ? prev.filter((id) => id !== m.userId) : [...prev, m.userId]
                                      );
                                    }}
                                  />
                                  <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium shrink-0">
                                    {getInitials(m.name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate flex items-center gap-1">
                                      {m.name}
                                      {isLead && <span className="text-[9px] text-amber-600 font-semibold">(Lead)</span>}
                                    </p>
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
                              {m.avatar ? (
                                <img src={m.avatar} alt={m.name} className="size-full object-cover" />
                              ) : (
                                <span className="text-[9px] font-bold text-muted-foreground">
                                  {getInitials(m.name)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate max-w-[120px] flex items-center gap-1">
                                {m.name}
                                {isLead && <CrownIcon className="size-3 text-amber-500 shrink-0" />}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{m.email}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedMemberIds((prev) => prev.filter((p) => p !== id))}
                              className="ml-0.5 rounded-full hover:bg-destructive/10 p-0.5 text-muted-foreground hover:text-destructive shrink-0"
                            >
                              <XIcon className="size-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setMemberSearch(""); }} disabled={submitting}>
                  Cancel
                </Button>
                <Button disabled={!teamName.trim() || submitting} onClick={handleSubmit}>
                  {submitting ? <Loader2Icon className="size-4 animate-spin" /> : editingTeam ? "Save Changes" : "Create Team"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* View Member Dialog */}
          <Dialog open={viewMemberOpen} onOpenChange={(o) => { if (!o) { setViewMemberOpen(false); setViewMember(null); } }}>
            <DialogContent className="p-0 flex flex-col">
              {viewMember && (
                <>
                  <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      <UsersIcon className="size-5" />
                      {viewMember.name}
                    </DialogTitle>
                    <DialogDescription>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="capitalize text-xs bg-muted rounded-full px-2.5 py-0.5">{viewMember.role}</span>
                        {viewMember.department && (
                          <span className="text-xs text-muted-foreground">{viewMember.department}</span>
                        )}
                      </div>
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto px-6 py-3 space-y-5">
                    <div className="flex gap-6 items-start">
                      <div className="size-20 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-border">
                        {viewMember.avatar ? (
                          <img src={viewMember.avatar} alt={viewMember.name} className="size-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-muted-foreground">
                            {viewMember.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-card px-4 py-3">
                          <p className="text-[11px] text-muted-foreground">Name</p>
                          <p className="text-sm font-medium mt-0.5">{viewMember.name}</p>
                        </div>
                        <div className="rounded-lg border bg-card px-4 py-3">
                          <p className="text-[11px] text-muted-foreground">Email</p>
                          <p className="text-sm font-medium mt-0.5">{viewMember.email}</p>
                        </div>
                        <div className="rounded-lg border bg-card px-4 py-3">
                          <p className="text-[11px] text-muted-foreground">Role</p>
                          <p className="text-sm font-medium mt-0.5 capitalize">{viewMember.role}</p>
                        </div>
                        <div className="rounded-lg border bg-card px-4 py-3">
                          <p className="text-[11px] text-muted-foreground">Department</p>
                          <p className="text-sm font-medium mt-0.5">{viewMember.department || "\u2014"}</p>
                        </div>
                        <div className="rounded-lg border bg-card px-4 py-3">
                          <p className="text-[11px] text-muted-foreground">Designation</p>
                          <p className="text-sm font-medium mt-0.5">{viewMember.designation || "\u2014"}</p>
                        </div>
                        <div className="rounded-lg border bg-card px-4 py-3">
                          <p className="text-[11px] text-muted-foreground">Status</p>
                          <p className="text-sm font-medium mt-0.5 capitalize">{viewMember.status || "\u2014"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2">
                    <Button variant="outline" onClick={() => { setViewMemberOpen(false); setViewMember(null); }}>
                      Close
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
