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
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PlusIcon, XIcon, Loader2Icon } from "lucide-react";
import { columns, type Project } from "./columns";
import { DataTable } from "./data-table";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectColor, setProjectColor] = useState("#3b82f6");
  const [viewProject, setViewProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editAccess, setEditAccess] = useState<"Public" | "Private">("Public");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);

  const colors = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  ];

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
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
        return null;
      })
      .then((res) => res?.json())
      .then((data) => {
        if (data) setProjects(data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!projectName || !selectedClient || !orgId) return;

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
          access: "Public",
          status: "Active",
        }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        setProjects((prev) => [...prev, d.data]);
      }
      setShowForm(false);
      setProjectName("");
      setSelectedClient("");
      setProjectColor("#3b82f6");
    } catch {}
  }

  function handleView(project: Project) {
    setViewProject(project);
    setEditName(project.name);
    setEditClient(project.client);
    setEditColor(project.color);
    setEditAccess(project.access);
    setEditStatus(project.status);
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
            <Button onClick={() => setShowForm(true)} disabled={!orgId}>
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

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
            <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold">New Project</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-md p-1 hover:bg-muted transition-colors"
                >
                  <XIcon className="size-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Project Name</label>
                  <Input
                    placeholder="Enter project name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client</label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Color</label>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2 flex-wrap">
                      {colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setProjectColor(c)}
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
                      className="size-8 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" disabled={!projectName || !selectedClient} onClick={handleSubmit}>
                    Create
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewProject(null)}>
            <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold">Edit Project</h2>
                <button
                  onClick={() => setViewProject(null)}
                  className="rounded-md p-1 hover:bg-muted transition-colors"
                >
                  <XIcon className="size-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Project Name</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client</label>
                  <Select value={editClient} onValueChange={setEditClient}>
                    <SelectTrigger>
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
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Access</label>
                  <Select value={editAccess} onValueChange={(v) => setEditAccess(v as "Public" | "Private")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">Public</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as "Active" | "Inactive")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Color</label>
                  <div className="flex items-center gap-3">
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

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setViewProject(null)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleSave}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
