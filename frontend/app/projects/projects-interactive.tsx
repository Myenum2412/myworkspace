"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import type { Project } from "@/components/projects/project-types";
import { PROJECT_COLORS } from "@/components/projects/project-types";
import { getSocketIO } from "@/lib/socketio-client";
import { ProjectDetailedView } from "./project-detailed-view";
import ProjectList from "@/components/projects/project-list";
import { ProjectCreateForm, ProjectEditForm } from "@/components/projects/project-form";
import ProjectDeleteDialog from "@/components/projects/project-card";

export interface ProjectsInteractiveProps {
  orgId: string;
  initialProjects: Project[];
  initialClientList: string[];
}

export default function ProjectsInteractive({
  orgId,
  initialProjects,
  initialClientList,
}: ProjectsInteractiveProps) {
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });
  const [showForm, setShowForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDeadline, setProjectDeadline] = useState("");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [projectColor, setProjectColor] = useState("#93c5fd");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [viewProject, setViewProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editAccess, setEditAccess] = useState<"Public" | "Private">("Public");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [loading, setLoading] = useState(false);
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [clientList, setClientList] = useState<string[]>(initialClientList);
  const [employees, setEmployees] = useState<{ id: string; name: string; email: string; image?: string }[]>([]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return employees;
    const q = memberSearch.toLowerCase();
    return employees.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [employees, memberSearch]);

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => setUser({ name: "Jane Smith", email: "jane@example.com", avatar: "" }));
  }, []);

  useEffect(() => {
    if (clientList.length > 0) return;
    fetch("/api/clients", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : d.data || [];
        const names = arr.map((c: { name?: string }) => c.name).filter(Boolean);
        if (names.length > 0) setClientList(names);
      })
      .catch(() => setClientList(["Acme Corp", "Globex Inc", "Initech"]));
  }, [clientList.length]);

  useEffect(() => {
    fetch("/api/employees", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const arr = d?.data || [];
        setEmployees(arr.map((e: { id?: string; _id?: string; name: string; email: string; image?: string }) => ({
          id: e.id || e._id || "",
          name: e.name,
          email: e.email,
          image: e.image,
        })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!orgId) return;
    let alive = true;
    const sock: any = getSocketIO();
      sock.on("project:created", (d: any) => {
        const p = d?.payload ?? d;
        if (!orgId || p.orgId !== orgId) return;
        setProjects((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
      });
      sock.on("project:updated", (d: any) => {
        const p = d?.payload ?? d;
        if (!orgId || p.orgId !== orgId) return;
        setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
      });
      sock.on("project:deleted", (d: any) => {
        const { id } = d?.payload ?? d;
        setProjects((prev) => prev.filter((x) => x.id !== id));
      });
    return () => {
      alive = false;
      if (sock) {
        sock.off("project:created");
        sock.off("project:updated");
        sock.off("project:deleted");
      }
    };
  }, [orgId]);

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
          members: projectMembers,
        }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        setProjects((prev) => [...prev, d.data]);
      } else {
        setFormError(d.error === "Validation failed" ? "Please fill in all required fields." : (d.error || "Failed to create project"));
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
        members: projectMembers,
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
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  function handleView(project: Project) {
    setViewProject(project);
  }

  function handleEditFromView(project: Project) {
    setEditingProject(project);
    setEditName(project.name);
    setEditClient(project.client);
    setEditColor(project.color);
    setEditAccess(project.access);
    setEditStatus(project.status);
    setEditDescription(project.description || "");
    setEditDeadline(project.deadline || "");
    setShowEdit(true);
  }

  function handleEdit(project: Project) {
    setEditingProject(project);
    setEditName(project.name);
    setEditClient(project.client);
    setEditColor(project.color);
    setEditAccess(project.access);
    setEditStatus(project.status);
    setEditDescription(project.description || "");
    setEditDeadline(project.deadline || "");
    setShowEdit(true);
  }

  async function handleDelete(project: Project) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
      }
    } catch {} finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  }

  async function handleSave() {
    if (!editingProject) return;

    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orgId,
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
        setProjects((prev) => prev.map((p) => (p.id === editingProject.id ? d.data : p)));
      }
      setShowEdit(false);
      setEditingProject(null);
    } catch {
      setShowEdit(false);
      setEditingProject(null);
    }
  }

  function resetForm() {
    setProjectName("");
    setSelectedClient("");
    setProjectDescription("");
    setProjectDeadline("");
    setProjectColor("#93c5fd");
    setProjectMembers([]);
    setFormError("");
  }

  function resetEdit() {
    setShowEdit(false);
    setEditingProject(null);
  }

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        {viewProject ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setViewProject(null)}>← Back</Button>
                <h1 className="text-2xl font-bold">{viewProject.name}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEditFromView(viewProject)}>
                  Edit Project
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(viewProject)}>
                  <Trash2Icon className="mr-2 size-4" />Delete
                </Button>
              </div>
            </div>
            <ProjectDetailedView project={viewProject} />
          </div>
        ) : (
          <ProjectList
            projects={projects}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={(p) => setDeleteConfirm(p)}
            onNewProject={() => setShowForm(true)}
          />
        )}
      </main>

      <ProjectCreateForm
        open={showForm}
        onOpenChange={setShowForm}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        selectedClient={selectedClient}
        onSelectedClientChange={setSelectedClient}
        projectDescription={projectDescription}
        onProjectDescriptionChange={setProjectDescription}
        projectDeadline={projectDeadline}
        onProjectDeadlineChange={setProjectDeadline}
        projectColor={projectColor}
        onProjectColorChange={setProjectColor}
        projectMembers={projectMembers}
        onProjectMembersChange={setProjectMembers}
        submitting={submitting}
        formError={formError}
        clientList={clientList}
        filteredMembers={filteredMembers}
        memberSearch={memberSearch}
        onMemberSearchChange={setMemberSearch}
        colors={PROJECT_COLORS}
        onSubmit={handleSubmit}
        onCancel={() => { setShowForm(false); resetForm(); }}
      />

      <ProjectEditForm
        open={showEdit}
        onOpenChange={(o) => { if (!o) resetEdit(); }}
        editName={editName}
        onEditNameChange={setEditName}
        editClient={editClient}
        onEditClientChange={setEditClient}
        editColor={editColor}
        onEditColorChange={setEditColor}
        editAccess={editAccess}
        onEditAccessChange={setEditAccess}
        editStatus={editStatus}
        onEditStatusChange={setEditStatus}
        editDescription={editDescription}
        onEditDescriptionChange={setEditDescription}
        editDeadline={editDeadline}
        onEditDeadlineChange={setEditDeadline}
        colors={PROJECT_COLORS}
        onSubmit={handleSave}
        onCancel={resetEdit}
      />

      <ProjectDeleteDialog
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        deleting={deleting}
        onDelete={handleDelete}
      />
    </>
  );
}
