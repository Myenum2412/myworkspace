"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  ArrowLeftIcon,
  RefreshCwIcon,
  ListTodoIcon,
} from "@/lib/icons";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import dynamic from "next/dynamic";

const TiptapEditor = dynamic(() => import("@/components/ui/tiptap-editor").then((m) => ({ default: m.TiptapEditor })), { ssr: false });

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

const TASK_TYPES = [
  { id: "individual", name: "Individual Task", icon: UserIcon, desc: "Assigned to one person" },
  { id: "team", name: "Team Task", icon: UsersIcon, desc: "Collaborative team work" },
];

const priorities = [
  { id: "p1", name: "low" },
  { id: "p2", name: "medium" },
  { id: "p3", name: "high" },
  { id: "p4", name: "urgent" },
];

function buildTaskUploadFolder(project: string, taskTitle: string, dueDate?: Date): string {
  const seg = (v: string | undefined) =>
    (v || "")
      .replace(/[/\\]/g, "_")
      .replace(/\0/g, "")
      .replace(/\s+/g, "-")
      .replace(/[<>:"|?*]/g, "")
      .trim()
      .replace(/^\.+$/g, "")
      .slice(0, 80);
  const date = dueDate
    ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`
    : new Date().toISOString().slice(0, 10);
  return `${seg(project)}/${seg(taskTitle)}/${date}`;
}

function FormField({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className || ""}`}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function CreateTaskPageInteractive({ onClose, onSuccess }: { onClose?: () => void; onSuccess?: () => void }) {
  const router = useRouter();
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
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatType, setRepeatType] = useState<"daily" | "weekly">("daily");
  const [repeatStartDate, setRepeatStartDate] = useState<Date | undefined>(undefined);
  const [repeatEndDate, setRepeatEndDate] = useState<Date | undefined>(undefined);
  const [repeatStartDateOpen, setRepeatStartDateOpen] = useState(false);
  const [repeatEndDateOpen, setRepeatEndDateOpen] = useState(false);

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const controller = new AbortController();
    const { signal } = controller;

    setIsLoadingData(true);
    Promise.allSettled([
      employeeService.getAllEmployees().catch(() => []),
      teamService.getAllTeams().catch(() => []),
      fetch("/api/clients", { credentials: "include", signal }).then((r) => r.json()).catch(() => []),
      fetch("/api/projects-list", { credentials: "include", signal }).then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then((results) => {
      if (signal.aborted) return;
      const [staffResult, teamResult, clientsResult, projectsResult] = results;
      const staff = staffResult.status === "fulfilled" ? staffResult.value : [];
      const teamList = teamResult.status === "fulfilled" ? teamResult.value : [];
      const clientsRes = clientsResult.status === "fulfilled" ? clientsResult.value : [];
      const projectsRes = projectsResult.status === "fulfilled" ? projectsResult.value : { data: [] };

      setEmployees((staff as any[]).map((s) => ({
        id: s.id,
        name: `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.name || "Unknown",
        role: s.designation || s.role || "",
      })));
      setTeams((teamList as any[]).map((t) => ({
        id: t.id,
        name: t.name,
        created_by: t.headUserId || "",
        memberCount: t.memberCount || t.memberIds?.length || 0,
      })));
      const clientArr = Array.isArray(clientsRes)
        ? clientsRes
        : clientsRes?.initialClients || clientsRes?.data || [];
      const clientNames = clientArr.map((c: { name?: string }) => c.name).filter(Boolean);
      const projectArr = Array.isArray(projectsRes) ? projectsRes : projectsRes?.data || [];
      const mappedProjects = projectArr.map((p: { id?: string; name?: string; client?: string; clientName?: string }) => ({
        id: p.id || "",
        name: p.name || "",
        client: p.client || p.clientName || "",
      }));
      setProjectList(mappedProjects);
      const projectClientNames = [...new Set(mappedProjects.map((p: { client: string }) => p.client).filter(Boolean))];
      setClientList([...new Set([...clientNames, ...projectClientNames])]);

      setIsLoadingData(false);
    }).catch(() => {
      if (!signal.aborted) setIsLoadingData(false);
    });

    fetch("/api/tasks?limit=100", { credentials: "include", signal })
      .then((r) => r.json())
      .then((tasksRes) => {
        if (signal.aborted) return;
        const tasksArr = Array.isArray(tasksRes?.data) ? tasksRes.data : [];
        const savedDefs = tasksArr
          .filter((t: any) => t.isSaved)
          .map((t: any) => ({
            id: t.id || t._id,
            name: t.title,
            description: t.description,
            isActive: t.isActive !== false,
          }));
        const source = savedDefs.length > 0 ? savedDefs : ([] as TaskDefinition[]);
        const seen = new Set<string>();
        setLocalTaskDefs(source.filter((d: { id: string }) => {
          if (seen.has(d.id)) return false;
          seen.add(d.id);
          return true;
        }));
      })
      .catch(() => {});

    return () => controller.abort();
  }, [status]);

  const resetForm = () => {
    setTaskType("individual");
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
    setRepeatEnabled(false);
    setRepeatType("daily");
    setRepeatStartDate(undefined);
    setRepeatEndDate(undefined);
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!title.trim() || !description.trim() || !priority) {
      setFormError("Please fill in all required fields: Title, Description, and Priority.");
      return;
    }
    if (taskType === "team" && !selectedTeam) {
      setFormError("Please select a team before creating a team task.");
      return;
    }
    setFormError("");
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        project: projectName.trim() || undefined,
        type: taskType,
        priority,
        dueDate: dueDate?.toISOString(),
        isSaved,
        isActive,
      };

      if (repeatEnabled && repeatStartDate) {
        payload.repeatType = repeatType;
        payload.repeatStartDate = repeatStartDate.toISOString();
        if (repeatType === "weekly" && repeatEndDate) {
          payload.repeatEndDate = repeatEndDate.toISOString();
        }
      }

      if (selectedAssignee && taskType === "individual") {
        payload.assigneeId = selectedAssignee;
      }

      if (selectedTeam && taskType === "team") {
        payload.teamId = selectedTeam;
      }

      const created = await taskService.createTask(payload as unknown as Partial<Task>);
      const taskId = (created as any)?.taskId || (created as any)?._id || (created as any)?.id || "";

      if (taskId && uploadedFiles.length > 0) {
        const orgId = (session?.user as any)?.orgId || "";
        const storageFolder = buildTaskUploadFolder(projectName, title, dueDate);
        for (const file of Array.from(uploadedFiles)) {
          const fd = new FormData();
          fd.append("files", file as File);
          if (orgId) fd.append("orgId", orgId);
          fd.append("taskId", taskId);
          fd.append("moduleName", "task");
          fd.append("entityId", taskId);
          if (storageFolder) fd.append("storageFolder", storageFolder);
          await fetch("/api/files/upload", { method: "POST", credentials: "include", body: fd }).catch(() => {});
        }
      }

      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      resetForm();
      if (onSuccess) {
        onSuccess();
        return;
      }
      router.push("/alltasks");
    } catch (err: any) {
      setFormError(err?.message || "An error occurred while creating the task.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const TaskTypeIcon = TASK_TYPES.find(t => t.id === taskType)?.icon || UserIcon;

  return (
    <>
      <div className="px-6 py-4 shrink-0 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => { onClose ? onClose() : router.back(); }}>
              <ArrowLeftIcon className="size-4" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight">Create New Task</h2>
              <p className="text-sm text-muted-foreground">
                Create and assign work to your team
              </p>
            </div>
          </div>
          {localTaskDefs.length > 0 && (
            <Select onValueChange={(val) => {
              const selected = localTaskDefs.find((d) => d.id === val);
              if (selected) { setTitle(selected.name); setDescription(selected.description || ""); }
            }}>
              <SelectTrigger className="w-fit gap-1.5 rounded-lg text-xs font-medium text-muted-foreground truncate">
                <FileTextIcon className="size-3.5 shrink-0" />
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
        </div>
      </div>

      {formError && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive shrink-0">
          <AlertCircleIcon className="size-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="flex-1 grid grid-cols-2 min-h-0">
        <ScrollArea className="h-full border-r bg-muted/25">
          <div className="mx-auto max-w-[760px] space-y-4 px-5 py-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <ListTodoIcon className="size-3.5" />
                  </span>
                  Task Type
                  <Badge variant="secondary" className="ml-auto font-medium capitalize">
                    {taskType}
                  </Badge>
                </CardTitle>
                <CardDescription>Choose how this task should be assigned.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {TASK_TYPES.map(({ id, name, icon: Icon, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTaskType(id)}
                      className={`flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all ${taskType === id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"}`}
                    >
                      <span className={`flex size-8 items-center justify-center rounded-lg ${taskType === id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="text-sm font-medium text-foreground">{name}</span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </button>
                  ))}
                </div>

                <Separator />

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRepeatEnabled(!repeatEnabled)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${repeatEnabled ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >
                    <RefreshCwIcon className="size-3.5" />
                    Repeated
                  </button>
                  {repeatEnabled && (
                    <>
                      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                        <button
                          type="button"
                          onClick={() => setRepeatType("daily")}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${repeatType === "daily" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                        >
                          Daily
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRepeatType("weekly"); if (repeatStartDate) { const end = new Date(repeatStartDate); end.setDate(end.getDate() + 6); setRepeatEndDate(end); } }}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${repeatType === "weekly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                        >
                          Weekly
                        </button>
                      </div>
                      <Popover open={repeatStartDateOpen} onOpenChange={setRepeatStartDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="rounded-lg text-xs font-normal">
                            {repeatStartDate ? repeatStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Start date"}
                            <CalendarIcon className="size-3 ml-1" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-lg" align="start">
                          <Calendar
                            mode="single"
                            selected={repeatStartDate}
                            onSelect={(d) => {
                              setRepeatStartDate(d);
                              if (repeatType === "weekly" && d) {
                                const end = new Date(d);
                                end.setDate(end.getDate() + 6);
                                setRepeatEndDate(end);
                              }
                              setRepeatStartDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      {repeatType === "weekly" && (
                        <>
                          <span className="text-xs text-muted-foreground">to</span>
                          <Popover open={repeatEndDateOpen} onOpenChange={setRepeatEndDateOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="rounded-lg text-xs font-normal">
                                {repeatEndDate ? repeatEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "End date"}
                                <CalendarIcon className="size-3 ml-1" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-lg" align="start">
                              <Calendar mode="single" selected={repeatEndDate} onSelect={(d) => { setRepeatEndDate(d); setRepeatEndDateOpen(false); }} />
                            </PopoverContent>
                          </Popover>
                        </>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileTextIcon className="size-3.5" />
                  </span>
                  Task Details
                </CardTitle>
                <CardDescription>Describe the work that needs to be done.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Task Title" required>
                  <Input
                    placeholder="e.g. Design landing page hero section"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-sm rounded-lg"
                  />
                </FormField>

                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Client">
                    <Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); setProjectName(""); }}>
                      <SelectTrigger className="text-sm rounded-lg">
                        <SelectValue placeholder="Select" className="truncate" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {isLoadingData && clientList.length === 0 ? (
                          <div className="px-2 py-4 text-center text-xs text-muted-foreground">Loading clients...</div>
                        ) : clientList.length === 0 ? (
                          <div className="px-2 py-4 text-center text-xs text-muted-foreground">No clients</div>
                        ) : clientList.map((c) => (
                          <SelectItem key={c} value={c} className="text-sm truncate">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Project">
                    <Select value={projectName} onValueChange={setProjectName}>
                      <SelectTrigger className="text-sm rounded-lg">
                        <SelectValue placeholder="Select" className="truncate" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {(() => {
                          const visibleProjects = selectedClient
                            ? projectList.filter((p) => p.client === selectedClient)
                            : projectList;
                          if (isLoadingData && visibleProjects.length === 0) {
                            return <div className="px-2 py-4 text-center text-xs text-muted-foreground">Loading projects...</div>;
                          }
                          if (visibleProjects.length === 0) {
                            return <div className="px-2 py-4 text-center text-xs text-muted-foreground">No projects</div>;
                          }
                          return visibleProjects.map((p) => (
                            <SelectItem key={p.id || p.name} value={p.name} className="text-sm truncate">{p.name}</SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Priority" required>
                    <PrioritySelector
                      selectedPriority={priority}
                      priorities={priorities}
                      onSelect={(val: string) => {
                        if (val !== "quick-add") setPriority(val);
                      }}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <UsersIcon className="size-3.5" />
                  </span>
                  Assignment & Timeline
                </CardTitle>
                <CardDescription>Set the due date and who will complete this task.</CardDescription>
              </CardHeader>
              <CardContent>
                {taskType === "individual" && (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Due Date">
                      <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-between rounded-lg text-sm font-normal">
                            {dueDate ? (
                              <span>{dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            ) : (
                              <span className="text-muted-foreground">Select a date</span>
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
                        isLoading={isLoadingData}
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
                          <Button variant="outline" className="justify-between rounded-lg text-sm font-normal">
                            {dueDate ? (
                              <span>{dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            ) : (
                              <span className="text-muted-foreground">Select a date</span>
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
                        <SelectTrigger className="text-sm rounded-lg">
                          <SelectValue placeholder="Select a team" className="truncate" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {isLoadingData && teams.length === 0 ? (
                            <div className="px-2 py-4 text-center text-xs text-muted-foreground">Loading teams...</div>
                          ) : teams.length === 0 ? (
                            <div className="px-2 py-4 text-center text-xs text-muted-foreground">No teams</div>
                          ) : (
                            teams.map((t) => (
                              <SelectItem key={t.id} value={t.id} className="text-sm truncate">{t.name} ({t.memberCount} members)</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <PaperclipIcon className="size-3.5" />
                  </span>
                  Attachments
                </CardTitle>
                <CardDescription>Attach reference files for this task.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-dashed bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Drop files or click to browse</p>
                      <p className="text-xs text-muted-foreground truncate">PDF, DOC, XLS, images — up to 10MB</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs"
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
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <div className="flex flex-col min-h-0 bg-muted/25">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileTextIcon className="size-3.5" />
              </span>
              <h3 className="text-sm font-semibold">Description <span className="text-destructive">*</span></h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Add rich context, checklists, and instructions.</p>
          </div>
          <div className="flex-1 min-h-0 px-5 pb-5">
            <TiptapEditor
              value={description}
              onChange={setDescription}
              placeholder="Write your task description here..."
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t bg-background px-6 py-4 shrink-0">
        <Button
          variant="ghost"
          onClick={() => { onClose ? onClose() : router.back(); }}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim() || !description.trim() || !priority || (taskType === "team" && !selectedTeam)}
          className="rounded-lg"
        >
          {isSubmitting ? (
            <><Loader2 className="animate-spin mr-1.5" />Creating...</>
          ) : (
            <>
              <TaskTypeIcon className="size-3.5 mr-1.5" />
              Create {taskType === "individual" ? "Task" : "Team Task"}
            </>
          )}
        </Button>
      </div>
    </>
  );
}
