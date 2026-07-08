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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isSubmitting) onClose(); }}>
      <DialogContent className="p-0 flex flex-col w-auto h-auto max-w-[95vw] max-h-[95vh]">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0 pr-14">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <ListTodoIcon className="size-5" />
                New Task
              </DialogTitle>
              <DialogDescription>
                Create a new task and assign it to a staff member or team.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant={isSaved ? "default" : "outline"}
                size="sm"
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 ${!isSaved ? 'border-primary/20 hover:bg-primary/5 text-primary' : ''}`}
                onClick={() => setIsSaved(!isSaved)}
              >
                <BookmarkIcon className="size-4" />
                {isSaved ? "Task Saved" : "Save Task"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {formError && (
          <div className="mx-6 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircleIcon className="size-4 shrink-0" />
            {formError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4">
          {localTaskDefs.length > 0 && (
            <div className="flex items-center gap-3">
              <Label className="text-xs font-medium text-muted-foreground shrink-0">Quick fill from saved task:</Label>
              <Select onValueChange={(val) => {
                const selected = localTaskDefs.find((d) => d.id === val);
                if (selected) { setTitle(selected.name); setDescription(selected.description || ""); }
              }}>
                <SelectTrigger className="max-w-[220px] h-8 text-xs">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {localTaskDefs.filter((d) => d.isActive).map((def) => (
                    <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="taskTitle" className="text-sm font-medium">Task Title *</Label>
              <Input
                id="taskTitle"
                placeholder="e.g. Design new landing page"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="client" className="text-sm font-medium">Client</Label>
              <Select value={selectedClient} onValueChange={(v) => { setSelectedClient(v); setProjectName(""); }}>
                <SelectTrigger id="client" className="mt-1.5">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clientList.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="project" className="text-sm font-medium">Project</Label>
              <Select
                value={projectName}
                onValueChange={setProjectName}
              >
                <SelectTrigger id="project" className="mt-1.5">
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
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No projects available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-sm font-medium">Priority *</Label>
              <div className="mt-1.5">
                <PrioritySelector
                  selectedPriority={priority}
                  priorities={priorities}
                  onSelect={(val: string) => {
                    if (val !== "quick-add") setPriority(val);
                  }}
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Due Date</Label>
              <div className="mt-1.5">
                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {dueDate ? dueDate.toLocaleDateString() : "Select date"}
                      <CalendarIcon className="size-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border rounded-md" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={(d) => { setDueDate(d); setDueDateOpen(false); }} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm font-medium">Assignee</Label>
                <div className="flex items-center gap-1.5">
                  <Switch id="showTeam" checked={showTeamAsAssignee} onCheckedChange={setShowTeamAsAssignee} />
                  <Label htmlFor="showTeam" className="text-xs cursor-pointer text-muted-foreground">Assign to Team</Label>
                </div>
              </div>
              <div>
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
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Repeat</Label>
              <Select
                value={isRepeatedTask ? repeatFrequency || "" : "no"}
                onValueChange={(v) => { setIsRepeatedTask(v !== "no"); setRepeatFrequency(v === "no" ? null : v); }}
              >
                <SelectTrigger className="mt-1.5">
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
                      <Button variant="outline" className="w-full justify-between text-xs">
                        {repeatStartDate ? repeatStartDate.toLocaleDateString() : "Start date"}
                        <CalendarIcon className="size-3 ml-1" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border rounded-md" align="start">
                      <Calendar mode="single" selected={repeatStartDate} onSelect={(d) => { setRepeatStartDate(d); setRepeatStartDateOpen(false); }} />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="taskDescription" className="text-sm font-medium">Description *</Label>
            <div className="mt-1.5">
              <BlogEditor
                value={description}
                onChange={setDescription}
                placeholder="Describe the task details..."
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Attachments</Label>
            <div className="mt-1.5">
              <TableUpload onFilesChange={setUploadedFiles} compactImage={true} />
            </div>
          </div>
          

        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4 flex flex-row items-center justify-between sm:justify-between w-full">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim() || !description.trim() || !priority}>
            {isSubmitting ? (
              <><Loader2 className="size-4 animate-spin mr-2" />Creating...</>
            ) : (
              "Create Task"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
