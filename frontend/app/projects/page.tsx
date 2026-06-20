"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlusIcon, XIcon, Loader2Icon, AlertCircleIcon, UsersIcon } from "lucide-react";
import { columns, type Project } from "./columns";
import { DataTable } from "./data-table";
import { ProjectDetailedView } from "./project-detailed-view";

const FAKE_PROJECTS: Project[] = [
  { id: "proj_1", name: "Website Redesign", client: "Acme Corp", color: "#3b82f6", description: "Complete overhaul of corporate website", deadline: "2026-08-15", tracked: 120, progress: 65, access: "Public", status: "Active" },
  { id: "proj_2", name: "Mobile App", client: "Globex Inc", color: "#ef4444", description: "Cross-platform mobile application", deadline: "2026-10-01", tracked: 85, progress: 30, access: "Private", status: "Active" },
  { id: "proj_3", name: "Brand Identity", client: "Initech", color: "#10b981", description: "Brand guidelines and asset creation", deadline: "2026-06-30", tracked: 40, progress: 100, access: "Public", status: "Active" },
  { id: "proj_4", name: "Cloud Migration", client: "Umbrella Corp", color: "#f59e0b", description: "Migrate on-prem infrastructure to AWS", deadline: "2026-12-20", tracked: 200, progress: 15, access: "Private", status: "Active" },
  { id: "proj_5", name: "SEO Audit", client: "Wayne Enterprises", color: "#8b5cf6", description: "Full SEO audit and recommendations", deadline: "2026-05-01", tracked: 0, progress: 0, access: "Public", status: "Inactive" },
  { id: "proj_6", name: "Data Pipeline", client: "Acme Corp", color: "#06b6d4", description: "Real-time data processing pipeline", deadline: "2026-09-15", tracked: 60, progress: 45, access: "Private", status: "Active" },
  { id: "proj_7", name: "Dashboard MVP", client: "Stark Industries", color: "#f97316", description: "Internal analytics dashboard", deadline: "2026-07-01", tracked: 30, progress: 100, access: "Public", status: "Active" },
];

const FAKE_MEMBERS = [
  { value: "mem_1", label: "Alice Johnson", designation: "Senior Developer", department: "Engineering" },
  { value: "mem_2", label: "Bob Smith", designation: "Project Manager", department: "Product" },
  { value: "mem_3", label: "Carol Williams", designation: "Designer", department: "Design" },
  { value: "mem_4", label: "Dave Brown", designation: "Backend Developer", department: "Engineering" },
  { value: "mem_5", label: "Eve Davis", designation: "QA Engineer", department: "Quality" },
  { value: "mem_6", label: "Frank Miller", designation: "DevOps Engineer", department: "Infrastructure" },
  { value: "mem_7", label: "Grace Lee", designation: "Frontend Developer", department: "Engineering" },
  { value: "mem_8", label: "Henry Wilson", designation: "Data Analyst", department: "Data" },
  { value: "mem_9", label: "Ivy Chen", designation: "UX Researcher", department: "Design" },
  { value: "mem_10", label: "Jack Taylor", designation: "Full Stack Developer", department: "Engineering" },
  { value: "mem_11", label: "Karen White", designation: "Scrum Master", department: "Product" },
  { value: "mem_12", label: "Leo Martinez", designation: "Security Engineer", department: "Infrastructure" },
];

const clients = [
  "Acme Corp",
  "Globex Inc",
  "Initech",
  "Umbrella Corp",
  "Wayne Enterprises",
];

export default function ProjectsPage() {
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });
  const [showForm, setShowForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDeadline, setProjectDeadline] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectColor, setProjectColor] = useState("#3b82f6");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [viewProject, setViewProject] = useState<Project | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editAccess, setEditAccess] = useState<"Public" | "Private">("Public");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  const colors = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  ];

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => setUser({ name: "Jane Smith", email: "jane@example.com", avatar: "" }));
  }, []);

  useEffect(() => {
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const id = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (id) {
          setOrgId(id);
          return fetch(`/api/projects?orgId=${id}`, { credentials: "include" });
        }
        setProjects(FAKE_PROJECTS);
        return null;
      })
      .then((res) => res?.json())
      .then((data) => {
        if (data) setProjects(data.data || []);
      })
      .catch(() => setProjects(FAKE_PROJECTS))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!projectName || !selectedClient) return;

    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orgId,
          name: projectName,
          client: selectedClient,
          color: projectColor,
          description: projectDescription,
          deadline: projectDeadline || null,
          access: "Public",
          status: "Active",
        }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        setProjects((prev) => [...prev, d.data]);
      } else {
        setFormError(d.error || "Failed to create project");
        setSubmitting(false);
        return;
      }
    } catch {
      const newProject: Project = {
        id: `proj_${Date.now()}`,
        name: projectName,
        client: selectedClient,
        color: projectColor,
        description: projectDescription,
        deadline: projectDeadline || null,
        tracked: 0,
        progress: 0,
        access: "Public",
        status: "Active",
      };
      setProjects((prev) => [...prev, newProject]);
    } finally {
      setShowForm(false);
      setProjectName("");
      setSelectedClient("");
      setProjectDescription("");
      setProjectDeadline("");
      setProjectColor("#3b82f6");
      setProjectMembers([]);
      setSubmitting(false);
    }
  }

  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  function handleView(project: Project) {
    setViewProject(project);
  }

  function handleEditFromView(project: Project) {
    setViewProject(null);
    setEditName(project.name);
    setEditClient(project.client);
    setEditColor(project.color);
    setEditAccess(project.access);
    setEditStatus(project.status);
    setEditDescription(project.description || "");
    setEditDeadline(project.deadline || "");
    setShowEdit(true);
  }

  async function handleSave() {
    if (!viewProject) return;

    try {
      const res = await fetch(`/api/projects/${viewProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editName,
          client: editClient,
          color: editColor,
          access: editAccess,
          status: editStatus,
          description: editDescription,
          deadline: editDeadline || null,
        }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        setProjects((prev) => prev.map((p) => (p.id === viewProject.id ? d.data : p)));
      }
      setViewProject(null);
    } catch {}
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">All Projects</h1>
            <Button onClick={() => setShowForm(true)}>
              <PlusIcon className="mr-2 size-4" />
              New Project
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Project</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? <Loader2Icon className="size-5 animate-spin" /> : projects.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">On Going Project</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {loading ? <Loader2Icon className="size-5 animate-spin" /> : projects.filter((p) => p.progress > 0 && p.progress < 100).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">In Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {loading ? <Loader2Icon className="size-5 animate-spin" /> : projects.filter((p) => p.progress === 0).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {loading ? <Loader2Icon className="size-5 animate-spin" /> : projects.filter((p) => p.progress === 100).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project List</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <DataTable columns={columns} data={projects} meta={{ onView: handleView }} />
              )}
            </CardContent>
          </Card>
        </main>

        <Dialog open={showForm} onOpenChange={(open) => { if (!submitting) setShowForm(open); }}>
          <DialogContent className="w-full max-w-xl max-h-[90vh] h-auto p-0 flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <PlusIcon className="size-5" />
                New Project
              </DialogTitle>
              <DialogDescription>
                Create a new project for your organization.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="mx-6 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircleIcon className="size-4 shrink-0" />
                {formError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-5">
              {/* Section 1: Project Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  Project Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="projectName" className="text-sm">Project Name *</Label>
                    <Input
                      id="projectName"
                      placeholder="e.g. Website Redesign"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      disabled={submitting}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client" className="text-sm">Client *</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient} disabled={submitting}>
                      <SelectTrigger id="client" className="mt-1">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description" className="text-sm">Description</Label>
                  <textarea
                    id="description"
                    placeholder="Brief project description"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    disabled={submitting}
                    rows={2}
                    className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
              </div>

              <Separator />

              {/* Section 2: Timeline & Team */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  Timeline & Team
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="deadline" className="text-sm">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={projectDeadline}
                      onChange={(e) => setProjectDeadline(e.target.value)}
                      disabled={submitting}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="members" className="text-sm">Team Members</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="mt-1 w-full justify-start font-normal" disabled={submitting}>
                          <UsersIcon className="mr-2 size-4 shrink-0" />
                          {projectMembers.length === 0
                            ? "Select team members"
                            : `${projectMembers.length} member${projectMembers.length > 1 ? "s" : ""} selected`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-2" align="start">
                        <div className="relative mb-2">
                          <Input
                            placeholder="Search members..."
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            className="pl-8"
                          />
                          <svg
                            className="absolute left-2.5 top-2.5 size-4 text-muted-foreground"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                          </svg>
                        </div>
                        <div className="max-h-48 space-y-1 overflow-y-auto">
                          {FAKE_MEMBERS.filter(
                            (m) => m.label.toLowerCase().includes(memberSearch.toLowerCase()) || m.department.toLowerCase().includes(memberSearch.toLowerCase())
                          ).map((member) => {
                            const checked = projectMembers.includes(member.value);
                            return (
                              <label
                                key={member.value}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => {
                                    setProjectMembers((prev) =>
                                      checked ? prev.filter((v) => v !== member.value) : [...prev, member.value]
                                    );
                                  }}
                                />
                                <div className="flex flex-col">
                                  <span>{member.label}</span>
                                  <span className="text-xs text-muted-foreground">{member.designation} · {member.department}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        {projectMembers.length > 0 && (
                          <>
                            <Separator className="my-2" />
                            <div className="flex flex-wrap gap-1">
                              {projectMembers.map((id) => {
                                const m = FAKE_MEMBERS.find((x) => x.value === id);
                                return m ? (
                                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                    {m.label}
                                    <button
                                      type="button"
                                      onClick={() => setProjectMembers((prev) => prev.filter((v) => v !== id))}
                                      className="ml-0.5 hover:text-destructive"
                                    >
                                      <XIcon className="size-3" />
                                    </button>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section 3: Branding */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  Branding
                </h3>
                <div>
                  <Label className="text-sm">Color</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex gap-2 flex-wrap">
                      {colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setProjectColor(c)}
                          disabled={submitting}
                          className={`size-7 rounded-full ring-offset-2 ring-offset-background transition-all ${
                            projectColor === c ? "ring-2 ring-foreground scale-110" : ""
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={projectColor}
                      onChange={(e) => setProjectColor(e.target.value)}
                      disabled={submitting}
                      className="size-8 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 pb-6 pt-2 shrink-0 flex gap-2 sm:gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={!projectName || !selectedClient || submitting} onClick={handleSubmit}>
                {submitting ? <Loader2Icon className="size-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewProject} onOpenChange={(open) => { if (!open) setViewProject(null); }}>
          <DialogContent className="max-w-screen-xl w-full min-w-[95vw] max-h-[95vh] h-[90vh] p-0 flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
              <DialogTitle>Project Details</DialogTitle>
              <DialogDescription>View project information and performance.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-hidden">
              {viewProject && (
                <ProjectDetailedView project={viewProject} onEdit={handleEditFromView} />
              )}
            </div>
            <div className="shrink-0 border-t px-6 py-4 flex justify-end">
              <Button variant="outline" onClick={() => setViewProject(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent className="w-full max-w-xl max-h-[90vh] h-auto p-0 flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
              <DialogTitle className="flex items-center gap-2 text-xl">
                Edit Project
              </DialogTitle>
              <DialogDescription>
                Update project details.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 px-6 py-3">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Project Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Client</Label>
                  <Select value={editClient} onValueChange={setEditClient}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Description</Label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
                <div>
                  <Label className="text-sm">Deadline</Label>
                  <Input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Access</Label>
                  <Select value={editAccess} onValueChange={(v) => setEditAccess(v as "Public" | "Private")}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">Public</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Status</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as "Active" | "Inactive")}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Color</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex gap-2 flex-wrap">
                      {colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={`size-7 rounded-full ring-offset-2 ring-offset-background transition-all ${
                            editColor === c ? "ring-2 ring-foreground scale-110" : ""
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="size-8 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="px-6 pb-6 pt-2 shrink-0 flex gap-2 sm:gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
