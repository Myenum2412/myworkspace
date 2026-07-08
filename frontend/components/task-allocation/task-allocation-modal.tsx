"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ListTodoIcon,
  CalendarIcon,
  AlertCircleIcon,
  BookmarkIcon,
  XIcon,
  UserIcon,
  Building2Icon,
  FolderKanbanIcon,
  FlagIcon,
  RepeatIcon,
  CheckSquareIcon,
  UploadCloudIcon,
  UsersIcon,
  ClockIcon,
  AlignLeftIcon,
  SaveIcon,
  PlusIcon,
  FileTextIcon,
  ChevronDownIcon,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BlogEditor } from "@/components/ui/blog-editor";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
  onSaveTemplate?: (data: { name: string; description: string; isActive: boolean }) => Promise<{ success: boolean; error?: string }>;
}

const priorities = [
  { id: "p1", name: "low" },
  { id: "p2", name: "medium" },
  { id: "p3", name: "high" },
  { id: "p4", name: "urgent" },
];

function FieldCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function FormField({ label, icon, required, children }: { label: string; icon?: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
        {icon && <span className="size-3.5 text-[#94A3B8]">{icon}</span>}
        {label}
        {required && <span className="text-[#EF4444]">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function TaskAllocationModal({ open, onClose, taskDefinitions = [], onSaveTemplate }: TaskAllocationModalProps) {
  const router = useRouter();
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
  const [isRepeatedTask, setIsRepeatedTask] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<string | null>(null);
  const [repeatStartDate, setRepeatStartDate] = useState<Date | undefined>(undefined);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [localTaskDefs, setLocalTaskDefs] = useState<TaskDefinition[]>([]);
  const [taskStatus, setTaskStatus] = useState("todo");

  const [employees, setEmployees] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [repeatStartDateOpen, setRepeatStartDateOpen] = useState(false);
  const [userOrgId, setUserOrgId] = useState("");

  const [showTeamAsAssignee, setShowTeamAsAssignee] = useState(false);

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
      ]).then(([staff, teamList, clientsRes, projectsRes, userRes, settingsRes, tasksRes]) => {
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

        const settings = settingsRes?.data;
        setShowTeamAsAssignee(!!settings?.team?.showTeamAsAssignee);

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
    setIsRepeatedTask(false);
    setRepeatFrequency(null);
    setRepeatStartDate(undefined);
    setUploadedFiles([]);
    setFormError("");
    setIsSaved(false);
    setIsActive(true);
    setTaskStatus("todo");
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
        status: taskStatus,
      };
      if (selectedAssignee && selectedAssigneeType === "staff") {
        payload.assigneeId = selectedAssignee;
      } else if (selectedAssignee && selectedAssigneeType === "team") {
        payload.teamId = selectedAssignee;
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

  const descLen = description.length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isSubmitting) onClose(); }}>
      <DialogContent
        className="flex flex-col w-auto h-auto max-w-[900px] max-h-[90vh] p-0 gap-0 bg-white rounded-[20px] border border-[#E5E7EB] shadow-2xl"
        style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)" }}
      >
        {/* ─── Premium Header ─── */}
        <div className="shrink-0 flex items-start justify-between px-8 pt-8 pb-4">
          <div className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Create New Task
            </DialogTitle>
            <DialogDescription className="text-sm text-[#64748B]">
              Create and assign work to your team members
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSaved(!isSaved)}
              className="h-9 gap-1.5 rounded-xl border-[#E5E7EB] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            >
              <SaveIcon className="size-3.5" />
              {isSaved ? "Saved" : "Save Draft"}
            </Button>
            <DialogClose asChild>
              <button
                type="button"
                className="flex items-center justify-center size-8 rounded-xl text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#64748B] transition-colors"
              >
                <XIcon className="size-5" />
              </button>
            </DialogClose>
          </div>
        </div>

        {formError && (
          <div className="mx-8 mb-2 flex items-center gap-2 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#DC2626]">
            <AlertCircleIcon className="size-4 shrink-0" />
            {formError}
          </div>
        )}

        {/* ─── Quick fill ─── */}
        {localTaskDefs.length > 0 && (
          <div className="shrink-0 px-8 pb-2">
            <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-2.5">
              <FileTextIcon className="size-4 text-[#94A3B8]" />
              <span className="text-xs font-medium text-[#64748B]">Quick fill from saved task:</span>
              <Select onValueChange={(val) => {
                const selected = localTaskDefs.find((d) => d.id === val);
                if (selected) { setTitle(selected.name); setDescription(selected.description || ""); }
              }}>
                <SelectTrigger className="h-8 max-w-[200px] rounded-lg border-[#E5E7EB] text-xs">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {localTaskDefs.filter((d) => d.isActive).map((def) => (
                    <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* ─── Scrollable Form Body ─── */}
        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">
          {/* Task Information */}
          <FieldCard>
            <div className="flex items-center gap-2 mb-6">
              <div className="size-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                <FileTextIcon className="size-3.5 text-[#2563EB]" />
              </div>
              <span className="text-sm font-bold text-[#0F172A]">Task Information</span>
            </div>

            <div className="space-y-5">
              {/* Title — full width */}
              <FormField label="Task Title" required icon={<AlignLeftIcon className="size-3.5" />}>
                <Input
                  placeholder="e.g. Design new landing page"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12 rounded-xl border-[#E5E7EB] bg-white px-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#2563EB]/20 focus-visible:border-[#2563EB] transition-shadow"
                />
              </FormField>

              {/* Two-column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <FormField label="Client" icon={<Building2Icon className="size-3.5" />}>
                  <Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); setProjectName(""); }}>
                    <SelectTrigger className="h-12 rounded-xl border-[#E5E7EB] bg-white px-4 text-sm text-[#0F172A]">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientList.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Project" icon={<FolderKanbanIcon className="size-3.5" />}>
                  <Select value={projectName} onValueChange={setProjectName}>
                    <SelectTrigger className="h-12 rounded-xl border-[#E5E7EB] bg-white px-4 text-sm text-[#0F172A]">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedClient
                        ? projectList.filter((p) => p.client === selectedClient).map((p) => (
                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                          ))
                        : projectList.map((p) => (
                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                          ))}
                      {projectList.length === 0 && (
                        <div className="px-2 py-4 text-center text-sm text-[#94A3B8]">
                          No projects available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Priority" required icon={<FlagIcon className="size-3.5" />}>
                  <div className="h-12">
                    <PrioritySelector
                      selectedPriority={priority}
                      priorities={priorities}
                      onSelect={(val: string) => {
                        if (val !== "quick-add") setPriority(val);
                      }}
                    />
                  </div>
                </FormField>

                <FormField label="Due Date" icon={<CalendarIcon className="size-3.5" />}>
                  <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-12 w-full justify-between rounded-xl border-[#E5E7EB] bg-white px-4 text-sm font-normal text-[#0F172A] hover:bg-[#FAFBFC]"
                      >
                        {dueDate ? (
                          <span>{dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        ) : (
                          <span className="text-[#94A3B8]">Select due date</span>
                        )}
                        <CalendarIcon className="size-4 text-[#94A3B8]" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-[#E5E7EB] shadow-lg" align="start">
                      <Calendar mode="single" selected={dueDate} onSelect={(d) => { setDueDate(d); setDueDateOpen(false); }} />
                    </PopoverContent>
                  </Popover>
                </FormField>

                <FormField label="Assign To" icon={<UserIcon className="size-3.5" />}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-[#94A3B8]">Staff</span>
                            <Switch id="showTeam" checked={showTeamAsAssignee} onCheckedChange={setShowTeamAsAssignee} />
                    <Label htmlFor="showTeam" className="text-xs font-medium text-[#94A3B8] cursor-pointer">Team</Label>
                  </div>
                  <AssigneeSelector
                    selectedAssignee={selectedAssignee}
                    selectedAssigneeType={selectedAssigneeType}
                    employees={employees}
                    teams={teams}
                    showTeamAsAssignee={showTeamAsAssignee}
                    onSelect={(id: string, type: string) => {
                      setSelectedAssignee(id);
                      setSelectedAssigneeType(type as AssigneeType);
                    }}
                    onRemove={() => {
                      setSelectedAssignee(null);
                      setSelectedAssigneeType(null);
                    }}
                  />
                </FormField>

                <FormField label="Team" icon={<UsersIcon className="size-3.5" />}>
                  <Select value={isRepeatedTask ? repeatFrequency || "" : "no"} onValueChange={(v) => { setIsRepeatedTask(v !== "no"); setRepeatFrequency(v === "no" ? null : v); }}>
                    <SelectTrigger className="h-12 rounded-xl border-[#E5E7EB] bg-white px-4 text-sm text-[#0F172A]">
                      <SelectValue placeholder="No Repeat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No Repeat</SelectItem>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  {isRepeatedTask && repeatFrequency !== "Daily" && (
                    <div className="mt-2">
                      <Popover open={repeatStartDateOpen} onOpenChange={setRepeatStartDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="h-10 w-full justify-between rounded-xl border-[#E5E7EB] bg-white px-3 text-xs text-[#0F172A]">
                            {repeatStartDate ? (
                              <span>{repeatStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            ) : (
                              <span className="text-[#94A3B8]">Start date</span>
                            )}
                            <CalendarIcon className="size-3 text-[#94A3B8]" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-[#E5E7EB] shadow-lg" align="start">
                          <Calendar mode="single" selected={repeatStartDate} onSelect={(d) => { setRepeatStartDate(d); setRepeatStartDateOpen(false); }} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </FormField>

                <FormField label="Status" icon={<CheckSquareIcon className="size-3.5" />}>
                  <Select value={taskStatus} onValueChange={setTaskStatus}>
                    <SelectTrigger className="h-12 rounded-xl border-[#E5E7EB] bg-white px-4 text-sm text-[#0F172A]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </div>
          </FieldCard>

          {/* Description */}
          <FieldCard>
            <div className="flex items-center gap-2 mb-6">
              <div className="size-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                <AlignLeftIcon className="size-3.5 text-[#2563EB]" />
              </div>
              <span className="text-sm font-bold text-[#0F172A]">Description</span>
            </div>
            <div className="relative">
              <BlogEditor
                value={description}
                onChange={setDescription}
                placeholder="Describe the task in detail, including requirements, acceptance criteria, and any relevant context..."
              />
              <div className="mt-2 flex justify-end">
                <span className="text-xs text-[#94A3B8]">{descLen} characters</span>
              </div>
            </div>
          </FieldCard>

          {/* Attachments */}
          <FieldCard className="mb-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="size-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                <UploadCloudIcon className="size-3.5 text-[#2563EB]" />
              </div>
              <span className="text-sm font-bold text-[#0F172A]">Attachments</span>
            </div>
            <div className="rounded-2xl border-2 border-dashed border-[#E5E7EB] bg-[#FAFBFC] p-8 transition-all hover:border-[#2563EB]/40 hover:bg-[#F8FAFC]">
              <div className="flex flex-col items-center gap-4">
                <div className="size-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
                  <UploadCloudIcon className="size-7 text-[#2563EB]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#0F172A]">Drag & drop files here</p>
                  <p className="text-xs text-[#94A3B8] mt-1">Supports PDF, DOC, XLS, images, and more — up to 10MB each</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-px w-8 bg-[#E5E7EB]" />
                  <span className="text-xs text-[#94A3B8]">or</span>
                  <div className="h-px w-8 bg-[#E5E7EB]" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl border-[#E5E7EB] bg-white text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
                  onClick={() => {
                    const el = document.querySelector<HTMLInputElement>('[data-file-trigger]');
                    if (el) el.click();
                  }}
                >
                  <PlusIcon className="size-3.5 mr-1.5" />
                  Browse Files
                </Button>
              </div>
              <div className="mt-4" data-file-trigger>
                <TableUpload onFilesChange={setUploadedFiles} compactImage={true} />
              </div>
            </div>
          </FieldCard>
        </div>

        {/* ─── Sticky Footer ─── */}
        <div className="shrink-0 border-t border-[#E5E7EB] bg-white px-8 py-4 flex items-center justify-between rounded-b-[20px]">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-10 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
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
              className="h-10 rounded-xl border-[#E5E7EB] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] gap-1.5"
            >
              <SaveIcon className="size-3.5" />
              Save Draft
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !description.trim() || !priority}
              className="h-10 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isSubmitting ? (
                <><Loader2 className="size-4 animate-spin mr-2" />Creating...</>
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
