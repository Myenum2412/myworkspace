"use client";

import { useState, useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  CalendarIcon,
  AlertCircleIcon,
  XIcon,
  FileTextIcon,
  PaperclipIcon,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { BlogEditor } from "@/components/ui/blog-editor";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PrioritySelector, AssigneeSelector } from "@/components/task-allocation/components";
import type { AssigneeType } from "@/components/task-allocation/types";
import TableUpload from "@/components/table-upload";
import { taskService, type Task } from "@/lib/services/task-service";
import { employeeService } from "@/lib/services/employee-service";
import { teamService } from "@/lib/services/team-service";

interface TaskDefinition {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface TeamOption {
  id: string;
  name: string;
  created_by: string;
  memberCount: number;
}

interface TaskAllocationModalProps {
  open: boolean;
  onClose: () => void;
  taskDefinitions?: TaskDefinition[];
}

const priorities = [
  { id: "p1", name: "low" },
  { id: "p2", name: "medium" },
  { id: "p3", name: "high" },
  { id: "p4", name: "urgent" },
];

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function TaskAllocationModal({ open, onClose, taskDefinitions = [] }: TaskAllocationModalProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientList, setClientList] = useState<string[]>([]);
  const [projectList, setProjectList] = useState<{ id: string; name: string; client: string }[]>([]);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedAssigneeType, setSelectedAssigneeType] = useState<AssigneeType | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [localTaskDefs, setLocalTaskDefs] = useState<TaskDefinition[]>([]);

  const [employees, setEmployees] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [userOrgId, setUserOrgId] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  useEffect(() => {
    if (open) {
      setIsLoadingData(true);
      Promise.all([
        employeeService.getAllEmployees().catch(() => []),
        teamService.getAllTeams().catch(() => []),
        fetch("/api/clients", { credentials: "include" }).then((r) => r.json()).catch(() => []),
        fetch("/api/projects-list", { credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/user/me", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/settings", { credentials: "include" }).then((r) => r.json()).catch(() => null),
        fetch("/api/tasks?limit=100", { credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] })),
      ]).then(([staff, teamList, clientsRes, projectsRes, userRes, _settingsRes, tasksRes]) => {
        setUserOrgId((userRes as any)?.orgId || "");
        setEmployees((staff as any[]).map((s) => ({
          id: s.id,
          name: `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.name || "Unknown",
          role: s.designation || s.role || "",
        })));
        setTeams((teamList as any[]).map((t) => ({
          id: t.id,
          name: t.name,
          created_by: t.headUserId || "",
          memberCount: t.memberIds?.length || 0,
        })));
        const clientArr = Array.isArray(clientsRes) ? clientsRes : clientsRes?.data || [];
        const clientNames = clientArr.map((c: { name?: string }) => c.name).filter(Boolean);
        const projectArr = Array.isArray(projectsRes) ? projectsRes : projectsRes?.data || [];
        const mappedProjects = projectArr.map((p: { id?: string; name?: string; client?: string }) => ({
          id: p.id || "",
          name: p.name || "",
          client: p.client || "",
        }));
        setProjectList(mappedProjects);
        const projectClientNames = [...new Set(mappedProjects.map((p: { client: string }) => p.client).filter(Boolean))];
        setClientList([...new Set([...clientNames, ...projectClientNames])]);

        const tasksArr = Array.isArray(tasksRes?.data) ? tasksRes.data : [];
        const savedDefs = tasksArr
          .filter((t: any) => t.isSaved)
          .map((t: any) => ({
            id: t.id || t._id,
            name: t.title,
            description: t.description,
            isActive: t.isActive !== false,
          }));
        setLocalTaskDefs(savedDefs.length > 0 ? savedDefs : taskDefinitions);

        setIsLoadingData(false);
      });
    }
  }, [open]);

  const resetForm = () => {
    setTitle("");
    setSelectedClient("");
    setProjectName("");
    setDescription("");
    setPriority("");
    setDueDate(undefined);
    setSelectedAssignee(null);
    setSelectedAssigneeType(null);
    setSelectedTeam("");
    setUploadedFiles([]);
    setFormError("");
    setIsSaved(false);
    setIsActive(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !priority) {
      setFormError("Please fill in all required fields: Title, Description, and Priority.");
      return;
    }
    setFormError("");
    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        orgId: userOrgId,
        title: title.trim(),
        description: description.trim(),
        project: projectName.trim() || undefined,
        priority,
        dueDate: dueDate?.toISOString(),
        isSaved,
        isActive,
        status: "todo",
      };
      if (selectedAssignee) {
        payload.assigneeId = selectedAssignee;
      }
      if (selectedTeam) {
        payload.teamId = selectedTeam;
      }
      await taskService.createTask(payload as unknown as Partial<Task>);

      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      handleClose();
    } catch (err: any) {
      setFormError(err?.message || "An error occurred while creating the task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sm:max-w-[720px] p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden">
      {/* ─── Compact Header ─── */}
      <div className="shrink-0 flex items-start justify-between px-5 pt-4 pb-3 border-b">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold">Create New Task</h2>
          <p className="text-xs text-muted-foreground">
            Create and assign work to your team
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {localTaskDefs.length > 0 && (
            <Select onValueChange={(val) => {
              const selected = localTaskDefs.find((d) => d.id === val);
              if (selected) { setTitle(selected.name); setDescription(selected.description || ""); }
            }}>
              <SelectTrigger className="h-7 w-fit gap-1 rounded-lg border-none bg-muted px-2 text-xs font-medium text-muted-foreground shadow-none hover:bg-muted/80 [&>svg]:hidden">
                <FileTextIcon className="size-3" />
                <span className="max-w-[100px] truncate">Template</span>
              </SelectTrigger>
              <SelectContent align="end" className="text-xs">
                {localTaskDefs.filter((d) => d.isActive).map((def) => (
                  <SelectItem key={def.id} value={def.id} className="text-xs">{def.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </div>

        {formError && (
          <div className="shrink-0 mx-5 mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            <AlertCircleIcon className="size-3.5 shrink-0" />
            {formError}
          </div>
        )}

        {/* ─── Scrollable Form Body ─── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Row 1: Title (full width) */}
          <FormField label="Task Title" required>
            <Input
              placeholder="e.g. Design new landing page"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 rounded-lg text-sm"
            />
          </FormField>

          {/* Row 2: Client, Project, Priority */}
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Client">
              <Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); setProjectName(""); }}>
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  {clientList.map((c) => (
                    <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Project">
              <Select value={projectName} onValueChange={setProjectName}>
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  {selectedClient
                    ? projectList.filter((p) => p.client === selectedClient).map((p) => (
                        <SelectItem key={p.id} value={p.name} className="text-sm">{p.name}</SelectItem>
                      ))
                    : projectList.map((p) => (
                        <SelectItem key={p.id} value={p.name} className="text-sm">{p.name}</SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Priority" required>
              <div className="h-9">
                <PrioritySelector
                  selectedPriority={priority}
                  priorities={priorities}
                  onSelect={(val: string) => {
                    if (val !== "quick-add") setPriority(val);
                  }}
                />
              </div>
            </FormField>
          </div>

          {/* Row 3: Due Date, Assignee, Team */}
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Due Date">
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-between rounded-lg text-sm font-normal"
                  >
                    {dueDate ? (
                      <span>{dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    ) : (
                      <span className="text-muted-foreground">Due date</span>
                    )}
                    <CalendarIcon className="size-3.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={(d) => { setDueDate(d); setDueDateOpen(false); }} />
                </PopoverContent>
              </Popover>
            </FormField>

            <FormField label="Assign To">
              <AssigneeSelector
                selectedAssignee={selectedAssignee}
                selectedAssigneeType={selectedAssigneeType}
                employees={employees}
                teams={[]}
                showTeamAsAssignee={false}
                onSelect={(id: string) => {
                  setSelectedAssignee(id);
                  setSelectedAssigneeType("staff");
                }}
                onRemove={() => {
                  setSelectedAssignee(null);
                  setSelectedAssigneeType(null);
                }}
              />
            </FormField>

            <FormField label="Team">
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">No teams</div>
                  ) : (
                    teams.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-sm">{t.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Description */}
          <FormField label="Description" required>
            <BlogEditor
              value={description}
              onChange={setDescription}
              placeholder="Requirements, acceptance criteria, context..."
            />
          </FormField>

          {/* Attachments */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
              <PaperclipIcon className="size-3" />
              Attachments
            </Label>
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-3 transition-colors hover:border-primary/30">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <PaperclipIcon className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">Drop files or click to browse</p>
                  <p className="text-[11px] text-muted-foreground truncate">PDF, DOC, XLS, images — up to 10MB</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs shrink-0"
                  onClick={() => {
                    const el = document.querySelector<HTMLInputElement>('[data-file-trigger]');
                    if (el) el.click();
                  }}
                >
                  Browse
                </Button>
              </div>
              <div data-file-trigger className="mt-2">
                <TableUpload onFilesChange={setUploadedFiles} compactImage={true} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Compact Footer ─── */}
        <div className="shrink-0 border-t px-5 py-3 flex items-center justify-between bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-8 rounded-lg text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSaved(!isSaved)}
              disabled={isSubmitting}
              className="h-8 rounded-lg text-xs gap-1.5"
            >
              {isSaved ? "Unsave" : "Draft"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !description.trim() || !priority}
              size="sm"
              className="h-8 rounded-lg text-xs px-4"
            >
              {isSubmitting ? (
                <><Loader2 className="size-3.5 animate-spin mr-1.5" />Creating...</>
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </div>
    </div>
  );
}
