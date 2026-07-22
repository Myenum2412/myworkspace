"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Trash2Icon, LayoutDashboardIcon, Table2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/components/projects/project-types";
import { PROJECT_COLORS } from "@/components/projects/project-types";
import { ProjectDetailedView } from "./project-detailed-view";
import ProjectList from "@/components/projects/project-list";
import ProjectsDashboard from "./projects-dashboard";

import { ProjectCreateForm, ProjectEditForm } from "@/components/projects/project-form";
import ProjectDeleteDialog from "@/components/projects/project-card";
import { createProjectAction } from "@/actions/projects";

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
  const [projectPriority, setProjectPriority] = useState("medium");
  const [projectCategory, setProjectCategory] = useState("");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectBudget, setProjectBudget] = useState(0);
  const [projectAttachment, setProjectAttachment] = useState<File | null>(null);
  const [projectAccess, setProjectAccess] = useState<"Public" | "Private">("Public");
  const [projectHealth, setProjectHealth] = useState("on-track");

  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editCategory, setEditCategory] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editBudget, setEditBudget] = useState(0);
  const [editHealth, setEditHealth] = useState("on-track");
  const [editMembers, setEditMembers] = useState<string[]>([]);
  const [editMemberSearch, setEditMemberSearch] = useState("");
  const [editAttachment, setEditAttachment] = useState<File | null>(null);

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return employees;
    const q = memberSearch.toLowerCase();
    return employees.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [employees, memberSearch]);

  const editFilteredMembers = useMemo(() => {
    if (!editMemberSearch) return employees;
    const q = editMemberSearch.toLowerCase();
    return employees.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [employees, editMemberSearch]);

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

  async function handleSubmit() {
    if (!projectName || !selectedClient) return;

    setSubmitting(true);
    setFormError("");

    try {
      const formData = new FormData();
      formData.append("name", projectName);
      formData.append("client", selectedClient);
      formData.append("color", projectColor);
      formData.append("description", projectDescription);
      if (projectDeadline) formData.append("deadline", projectDeadline);
      formData.append("access", projectAccess);
      formData.append("health", projectHealth);
      formData.append("priority", projectPriority);
      formData.append("category", projectCategory);
      if (projectStartDate) formData.append("startDate", projectStartDate);
      formData.append("budget", String(projectBudget || 0));
      projectMembers.forEach((id) => formData.append("members", id));

      const result = await createProjectAction(formData);
      if (result.success && result.data) {
        const projId = (result.data as Record<string, unknown>).id as string;
        // Upload attachment if present
        if (projectAttachment && projId) {
          const fd = new FormData();
          fd.append("files", projectAttachment);
          fd.append("projectId", projId);
          fd.append("orgId", orgId);
          await fetch("/api/files/upload", { method: "POST", body: fd }).catch(() => {});
        }
        setProjects((prev) => [...prev, result.data as Project]);
      } else {
        setFormError(result.error || "Failed to create project");
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
        access: projectAccess,
        status: "Active",
        health: projectHealth as Project["health"],
        members: projectMembers,
        priority: projectPriority as Project["priority"],
        category: projectCategory,
        startDate: projectStartDate || null,
        budget: projectBudget || 0,
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

  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"dashboard" | "list">("dashboard");

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
    setEditPriority(project.priority || "medium");
    setEditCategory(project.category || "");
    setEditStartDate(project.startDate || "");
    setEditBudget(project.budget || 0);
    setEditHealth(project.health || "on-track");
    setEditMembers(project.members || []);
    setEditMemberSearch("");
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
    setEditPriority(project.priority || "medium");
    setEditCategory(project.category || "");
    setEditStartDate(project.startDate || "");
    setEditBudget(project.budget || 0);
    setEditHealth(project.health || "on-track");
    setEditMembers(project.members || []);
    setEditMemberSearch("");
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
    setSubmitting(true);

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
          priority: editPriority,
          category: editCategory,
          startDate: editStartDate || null,
          budget: editBudget,
          health: editHealth,
          members: editMembers,
        }),
      });
      const d = await res.json();
      if (d.success && d.data) {
        const projId = editingProject.id;
        // Upload attachment if present
        if (editAttachment) {
          const fd = new FormData();
          fd.append("files", editAttachment);
          fd.append("projectId", projId);
          fd.append("orgId", orgId);
          await fetch("/api/files/upload", { method: "POST", body: fd }).catch(() => {});
        }
        setProjects((prev) => prev.map((p) => (p.id === editingProject.id ? d.data : p)));
      }
      setShowEdit(false);
      setEditingProject(null);
    } catch {
      setShowEdit(false);
      setEditingProject(null);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setProjectName("");
    setSelectedClient("");
    setProjectDescription("");
    setProjectDeadline("");
    setProjectColor("#93c5fd");
    setProjectMembers([]);
    setProjectPriority("medium");
    setProjectCategory("");
    setProjectStartDate("");
    setProjectBudget(0);
    setProjectAttachment(null);
    setProjectAccess("Public");
    setProjectHealth("on-track");
    setFormError("");
  }

  function resetEdit() {
    setShowEdit(false);
    setEditingProject(null);
    setEditPriority("medium");
    setEditCategory("");
    setEditStartDate("");
    setEditBudget(0);
    setEditHealth("on-track");
    setEditMembers([]);
    setEditMemberSearch("");
    setEditAttachment(null);
  }

  const VIEW_TABS = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboardIcon },
    { id: "list", label: "List", icon: Table2Icon },
  ] as const;

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        {showEdit && editingProject ? (
          <ProjectEditForm
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
            editPriority={editPriority}
            onEditPriorityChange={setEditPriority}
            editCategory={editCategory}
            onEditCategoryChange={setEditCategory}
            editStartDate={editStartDate}
            onEditStartDateChange={setEditStartDate}
            editBudget={editBudget}
            onEditBudgetChange={setEditBudget}
            editHealth={editHealth}
            onEditHealthChange={setEditHealth}
            editMembers={editMembers}
            onEditMembersChange={setEditMembers}
            editMemberSearch={editMemberSearch}
            onEditMemberSearchChange={setEditMemberSearch}
            editAttachment={editAttachment}
            onEditAttachmentChange={setEditAttachment}
            filteredMembers={editFilteredMembers}
            clientList={clientList}
            colors={PROJECT_COLORS}
            submitting={submitting}
            formError={formError}
            onSubmit={handleSave}
            onCancel={resetEdit}
          />
        ) : viewProject ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="sm" onClick={() => setViewProject(null)}>← Back</Button>
                <h1 className="text-xl sm:text-2xl font-bold truncate">{viewProject.name}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="touch-target" onClick={() => handleEditFromView(viewProject)}>
                  Edit Project
                </Button>
                <Button variant="destructive" size="sm" className="touch-target" onClick={() => setDeleteConfirm(viewProject)}>
                  <Trash2Icon className="mr-2 size-4" />Delete
                </Button>
              </div>
            </div>
            <ProjectDetailedView project={viewProject} orgId={orgId} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-sm border p-0.5 bg-muted/50 shrink-0">
                {VIEW_TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setViewMode(t.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                        viewMode === t.id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="size-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <Button onClick={() => setShowForm(true)} size="sm">
                New Project
              </Button>
            </div>
            {showForm ? (
              <ProjectCreateForm
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
                projectPriority={projectPriority}
                onProjectPriorityChange={setProjectPriority}
                projectCategory={projectCategory}
                onProjectCategoryChange={setProjectCategory}
                projectStartDate={projectStartDate}
                onProjectStartDateChange={setProjectStartDate}
                projectBudget={projectBudget}
                onProjectBudgetChange={setProjectBudget}
                projectAttachment={projectAttachment}
                onProjectAttachmentChange={setProjectAttachment}
                projectAccess={projectAccess}
                onProjectAccessChange={setProjectAccess}
                projectHealth={projectHealth}
                onProjectHealthChange={setProjectHealth}
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
            ) : (
              <>
                {viewMode === "dashboard" && (
                  <>
                    <ProjectsDashboard projects={projects} />
                    <ProjectList
                      projects={projects}
                      loading={loading}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={(p) => setDeleteConfirm(p)}
                      onNewProject={() => setShowForm(true)}
                    />
                  </>
                )}
                {viewMode === "list" && (
                  <ProjectList
                    projects={projects}
                    loading={loading}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={(p) => setDeleteConfirm(p)}
                    onNewProject={() => setShowForm(true)}
                  />
                )}
              </>
            )}

          </div>
        )}
      </main>

      <ProjectDeleteDialog
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        deleting={deleting}
        onDelete={handleDelete}
      />
    </>
  );
}
