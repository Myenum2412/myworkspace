"use client";

import { useState, useEffect } from "react";
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

const clients: string[] = [];

export default function ProjectsPage() {
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });
  const [showForm, setShowForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDeadline, setProjectDeadline] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectColor, setProjectColor] = useState("#93c5fd");
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
  const [clientList, setClientList] = useState<string[]>([]);

  const colors = [
    "#93c5fd", "#fca5a5", "#86efac", "#fcd34d", "#c4b5fd",
    "#f9a8d4", "#67e8f9", "#fdba74", "#6ee7b7", "#a5b4fc",
  ];

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => setUser({ name: "Jane Smith", email: "jane@example.com", avatar: "" }));
  }, []);

  useEffect(() => {
    fetch("/api/clients", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : d.data || [];
        const names = arr.map((c: { name?: string }) => c.name).filter(Boolean);
        setClientList(names.length > 0 ? names : ["Acme Corp", "Globex Inc", "Initech"]);
      })
      .catch(() => setClientList(["Acme Corp", "Globex Inc", "Initech"]));
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
        setProjects([]);
        return null;
      })
      .then((res) => res?.json())
      .then((data) => {
        if (data) setProjects(data.data || []);
      })
      .catch((error) => {
        console.error("[PROJECTS] Failed to fetch projects:", error);
      })
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
      setProjectColor("#93c5fd");
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
      setShowEdit(false);
    } catch {}
  }

  return (
                                <>
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
                <div className="text-2xl font-bold text-red-500">
                  {loading ? <Loader2Icon className="size-5 animate-spin" /> : projects.filter((p) => p.progress > 0 && p.progress < 100).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">In Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-400">
                  {loading ? <Loader2Icon className="size-5 animate-spin" /> : projects.filter((p) => p.progress === 0).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
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
          <DialogContent className="p-0 flex flex-col">
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
                        {clientList.map((c) => (
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
                          <div className="flex items-center justify-center py-6">
                            <p className="text-sm text-muted-foreground">No members available</p>
                          </div>
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
          <DialogContent className="p-0 flex flex-col">
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
          <DialogContent className="p-0 flex flex-col">
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
      </>
  );
}
