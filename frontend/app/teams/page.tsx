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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { columns, type Team } from "./columns";
import { DataTable } from "./data-table";

const FAKE_TEAMS: Team[] = [
  { id: "team_1", name: "Engineering", description: "Core platform development", memberCount: 8, leadName: "Alice Chen", leadAvatar: "", createdAt: "2025-01-15T00:00:00Z" },
  { id: "team_2", name: "Design", description: "UI/UX and branding", memberCount: 5, leadName: "Marcus Lee", leadAvatar: "", createdAt: "2025-02-10T00:00:00Z" },
  { id: "team_3", name: "Marketing", description: "Growth and communications", memberCount: 6, leadName: "Sarah Kim", leadAvatar: "", createdAt: "2025-03-05T00:00:00Z" },
  { id: "team_4", name: "Sales", description: "Enterprise sales and partnerships", memberCount: 4, leadName: "James Wilson", leadAvatar: "", createdAt: "2025-01-20T00:00:00Z" },
  { id: "team_5", name: "QA", description: "Quality assurance and testing", memberCount: 3, leadName: "Priya Patel", leadAvatar: "", createdAt: "2025-04-01T00:00:00Z" },
];

const FAKE_ORG_MEMBERS: OrgMember[] = [
  { userId: "u1", name: "Alice Chen", email: "alice@company.com", avatar: "", role: "admin" },
  { userId: "u2", name: "Marcus Lee", email: "marcus@company.com", avatar: "", role: "member" },
  { userId: "u3", name: "Sarah Kim", email: "sarah@company.com", avatar: "", role: "member" },
  { userId: "u4", name: "James Wilson", email: "james@company.com", avatar: "", role: "member" },
  { userId: "u5", name: "Priya Patel", email: "priya@company.com", avatar: "", role: "member" },
  { userId: "u6", name: "Tom Rodriguez", email: "tom@company.com", avatar: "", role: "member" },
  { userId: "u7", name: "Emma Davis", email: "emma@company.com", avatar: "", role: "member" },
  { userId: "u8", name: "Lisa Wang", email: "lisa@company.com", avatar: "", role: "member" },
];

type OrgMember = {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
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
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Team detail / members state
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

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
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(team: Team) {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamDescription(team.description);
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!teamName.trim()) return;
    setSubmitting(true);
    setFormError("");

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
        }
      }
      if (!formError) {
        setShowForm(false);
        setEditingTeam(null);
        setTeamName("");
        setTeamDescription("");
        await fetchTeams();
      }
    } catch {
      setFormError("Network error. Try again.");
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
                        <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
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
                          </div>
                          <div className="flex items-center gap-1">
                            {m.role !== "lead" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleSetLead(m.userId)}
                              >
                                <CrownIcon className="size-3 mr-1" />
                                Set Lead
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleRemoveMember(m.userId)}
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
                <Button onClick={openCreateForm} disabled={!orgId}>
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
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon-sm">
                                      <MoreHorizontalIcon className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openTeamDetail(team)}>
                                      <UsersIcon className="mr-2 size-4" />
                                      View Members
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEditForm(team)}>
                                      <PencilIcon className="mr-2 size-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(team.id)}>
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
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}

          <Dialog open={showForm} onOpenChange={(open) => { if (!submitting && !open) setShowForm(false); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTeam ? "Edit Team" : "New Team"}</DialogTitle>
                <DialogDescription>
                  {editingTeam ? "Update the team name and description." : "Create a new team for your organization."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircleIcon className="size-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <div>
                  <Label htmlFor="teamName">Team Name *</Label>
                  <Input
                    id="teamName"
                    placeholder="e.g. Engineering, Marketing"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <Label htmlFor="teamDescription">Description</Label>
                  <Textarea
                    id="teamDescription"
                    placeholder="Brief description of the team"
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    disabled={submitting}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button disabled={!teamName.trim() || submitting} onClick={handleSubmit}>
                  {submitting ? <Loader2Icon className="size-4 animate-spin" /> : editingTeam ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
