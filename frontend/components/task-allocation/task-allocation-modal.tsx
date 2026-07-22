"use client";

import { useState, useEffect, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  CalendarIcon,
  AlertCircleIcon,
  XIcon,
  FileTextIcon,
  PaperclipIcon,
  UserIcon,
  UsersIcon,
  ClockIcon,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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

const TASK_TYPES = [
  { id: "individual", name: "Individual Task", icon: UserIcon, desc: "Assigned to one person" },
  { id: "team", name: "Team Task", icon: UsersIcon, desc: "Collaborative team work" },
  { id: "upcoming", name: "Upcoming Task", icon: ClockIcon, desc: "Future scheduled task" },
];

const priorities = [
  { id: "p1", name: "low" },
  { id: "p2", name: "medium" },
  { id: "p3", name: "high" },
  { id: "p4", name: "urgent" },
];

function FormField({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1 ${className || ""}`}>
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function TaskAllocationModal({ open, onClose, taskDefinitions = [] }: TaskAllocationModalProps) {
  const queryClient = useQueryClient();

  const [taskType, setTaskType] = useState("individual");

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
  const [selectedTeam, setSelectedTeam] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);

  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [formError, setFormError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [localTaskDefs, setLocalTaskDefs] = useState<TaskDefinition[]>([]);

  const [employees, setEmployees] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [scheduledDateOpen, setScheduledDateOpen] = useState(false);
  const [userOrgId, setUserOrgId] = useState("");

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const { signal } = controller;

    setIsLoadingData(true);
    Promise.all([
      employeeService.getAllEmployees().catch(() => []),
      teamService.getAllTeams().catch(() => []),
      fetch("/api/clients", { credentials: "include", signal }).then((r) => r.json()).catch(() => []),
      fetch("/api/projects-list", { credentials: "include", signal }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/user/me", { credentials: "include", signal }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/settings", { credentials: "include", signal }).then((r) => r.json()).catch(() => null),
      fetch("/api/tasks?limit=100", { credentials: "include", signal }).then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([staff, teamList, clientsRes, projectsRes, userRes, _settingsRes, tasksRes]) => {
      if (signal.aborted) return;
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
      const source = savedDefs.length > 0 ? savedDefs : (taskDefinitions as { id: string }[]);
      const seen = new Set<string>();
      setLocalTaskDefs(source.filter((d: { id: string }) => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      }));

      setIsLoadingData(false);
    });

    return () => controller.abort();
  }, [open]);

  const resetForm = () => {
    setTaskType("individual");
    setTitle("");
    setSelectedClient("");
    setProjectName("");
    setDescription("");
    setPriority("");
    setDueDate(undefined);
    setScheduledDate(undefined);
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
    if (submittingRef.current) return;
    if (!title.trim() || !description.trim() || !priority) {
      setFormError("Please fill in all required fields: Title, Description, and Priority.");
      return;
    }
    setFormError("");
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        orgId: userOrgId,
        title: title.trim(),
        description: description.trim(),
        project: projectName.trim() || undefined,
        type: taskType,
        priority,
        dueDate: dueDate?.toISOString(),
        isSaved,
        isActive,
      };

      if (taskType === "upcoming") {
        payload.scheduledDate = scheduledDate?.toISOString() || dueDate?.toISOString();
      }

      if (selectedAssignee && taskType === "individual") {
        payload.assigneeId = selectedAssignee;
      }

      if (selectedTeam && taskType === "team") {
        payload.teamId = selectedTeam;
      }

      await taskService.createTask(payload as unknown as Partial<Task>);

      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      handleClose();
    } catch (err: any) {
      setFormError(err?.message || "An error occurred while creating the task.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const TaskTypeIcon = TASK_TYPES.find(t => t.id === taskType)?.icon || UserIcon;

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-[90vw] max-h-[100vh] min-h-[80vh] w-full flex flex-col overflow-hidden p-0 gap-0">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-semibold">Create New Task</h2>
            <p className="text-xs text-muted-foreground">
              Create and assign work to your team
            </p>
          </div>
          <div className="flex items-center gap-1">
            {localTaskDefs.length > 0 && (
              <Select onValueChange={(val) => {
                const selected = localTaskDefs.find((d) => d.id === val);
                if (selected) { setTitle(selected.name); setDescription(selected.description || ""); }
              }}>
                <SelectTrigger className="h-7 w-fit gap-1 border text-xs font-medium text-muted-foreground">
                  <FileTextIcon className="size-3" />
                  <span className="max-w-[100px] truncate">Template</span>
                </SelectTrigger>
                <SelectContent align="end" className="text-xs">
                  {localTaskDefs
                    .filter((d) => d.isActive)
                    .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i)
                    .map((def) => (
                    <SelectItem key={def.id} value={def.id} className="text-xs">{def.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center justify-center size-7 text-muted-foreground hover:bg-muted"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>

        {formError && (
          <div className="mx-6 flex items-center gap-2 border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive shrink-0">
            <AlertCircleIcon className="size-3.5 shrink-0" />
            {formError}
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {/* Left Column: Fields */}
            <div className="md:col-span-2 space-y-6">

          {/* Task Type Selector */}
          <FormField label="Task Category" required>
            <div className="grid grid-cols-3 gap-1.5">
              {TASK_TYPES.map(({ id, name, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTaskType(id)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-[11px] font-medium transition-colors ${
                    taskType === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="size-4" />
                  <span className="text-center leading-tight">{name}</span>
                </button>
              ))}
            </div>
          </FormField>

          {/* Title */}
          <FormField label="Task Title" required>
            <Input
              placeholder=""
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
            />
          </FormField>

          {/* Row: Client, Project, Priority */}
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Client">
              <Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); setProjectName(""); }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="" />
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
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="" />
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

          {/* Type-specific fields */}
          {taskType === "individual" && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Due Date">
                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-full justify-between text-sm font-normal">
                      {dueDate ? (
                        <span>{dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      ) : (
                        <span className="text-muted-foreground">Due date</span>
                      )}
                      <CalendarIcon className="size-3.5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-lg" align="start">
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
            </div>
          )}

          {taskType === "team" && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Due Date">
                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-full justify-between text-sm font-normal">
                      {dueDate ? (
                        <span>{dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      ) : (
                        <span className="text-muted-foreground">Due date</span>
                      )}
                      <CalendarIcon className="size-3.5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-lg" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={(d) => { setDueDate(d); setDueDateOpen(false); }} />
                  </PopoverContent>
                </Popover>
              </FormField>

              <FormField label="Assign Team" required>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.length === 0 ? (
                      <div className="px-2 py-4 text-center text-xs text-muted-foreground">No teams</div>
                    ) : (
                      teams.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-sm">{t.name} ({t.memberCount} members)</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          )}

          {taskType === "upcoming" && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Scheduled Date" required>
                <Popover open={scheduledDateOpen} onOpenChange={setScheduledDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-full justify-between text-sm font-normal">
                      {scheduledDate ? (
                        <span>{scheduledDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      ) : (
                        <span className="text-muted-foreground">Pick start date</span>
                      )}
                      <CalendarIcon className="size-3.5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-lg" align="start">
                    <Calendar mode="single" selected={scheduledDate} onSelect={(d) => { setScheduledDate(d); setScheduledDateOpen(false); }} />
                  </PopoverContent>
                </Popover>
              </FormField>

              <FormField label="Due Date">
                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-full justify-between text-sm font-normal">
                      {dueDate ? (
                        <span>{dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      ) : (
                        <span className="text-muted-foreground">Due date</span>
                      )}
                      <CalendarIcon className="size-3.5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-lg" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={(d) => { setDueDate(d); setDueDateOpen(false); }} />
                  </PopoverContent>
                </Popover>
              </FormField>
            </div>
          )}

          {/* Attachments */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <PaperclipIcon className="size-3" />
              Attachments
            </Label>
            <div className="border border-dashed p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">Drop files or click to browse</p>
                  <p className="text-[11px] text-muted-foreground truncate">PDF, DOC, XLS, images — up to 10MB</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
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

            {/* Right Column: Description */}
            <div className="md:col-span-3 flex flex-col min-h-0">
              <FormField label="Description" required className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 flex flex-col min-h-0">
                  <BlogEditor
                    value={description}
                    onChange={setDescription}
                    placeholder=""
                  />
                </div>
              </FormField>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/10 shrink-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !description.trim() || !priority}
          >
            {isSubmitting ? (
              <><Loader2 className="size-3.5 animate-spin mr-1.5" />Creating...</>
            ) : (
              <>
                <TaskTypeIcon className="size-3.5 mr-1.5" />
                Create {taskType === "individual" ? "Task" : taskType === "team" ? "Team Task" : "Upcoming Task"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
