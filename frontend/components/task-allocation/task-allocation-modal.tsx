"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ListTodoIcon,
  CalendarIcon,
  AlertCircleIcon,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [projectName, setProjectName] = useState("");
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

  const [employees, setEmployees] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [repeatStartDateOpen, setRepeatStartDateOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoadingData(true);
      Promise.all([
        employeeService.getAllEmployees().catch(() => []),
        teamService.getAllTeams().catch(() => []),
      ]).then(([staff, teamList]) => {
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
        setIsLoadingData(false);
      });
    }
  }, [open]);

  const resetForm = () => {
    setTitle("");
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
      await taskService.createTask({
        task: title.trim(),
        description: description.trim(),
        project: projectName.trim() || undefined,
        priority,
        status: "Open",
        assignedTo:
          String(selectedAssigneeType) === "staff"
            ? employees.find((e) => e.id === selectedAssignee)?.name || "Unassigned"
            : teams.find((t) => t.id === selectedAssignee)?.name || "Unassigned",
        delegatedBy: "Admin",
        dueDate: dueDate?.toISOString(),
        finalStatus: "Open",
      } as unknown as Partial<Task>);

      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      handleClose();
    } catch {
      setFormError("An error occurred while creating the task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isSubmitting) handleClose(); }}>
      <DialogContent className="p-0 flex flex-col w-auto h-auto max-w-[90vw] max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ListTodoIcon className="size-5" />
            New Task
          </DialogTitle>
          <DialogDescription>
            Create a new task and assign it to a staff member or team.
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="mx-6 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircleIcon className="size-4 shrink-0" />
            {formError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4">
          {taskDefinitions.length > 0 && (
            <div className="flex items-center gap-3">
              <Label className="text-xs font-medium text-muted-foreground shrink-0">Quick fill from saved task:</Label>
              <Select onValueChange={(val) => {
                const selected = taskDefinitions.find((d) => d.id === val);
                if (selected) { setTitle(selected.name); setDescription(selected.description || ""); }
              }}>
                <SelectTrigger className="max-w-[220px] h-8 text-xs">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {taskDefinitions.filter((d) => d.isActive).map((def) => (
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
              <Label htmlFor="projectName" className="text-sm font-medium">Project Name</Label>
              <Input
                id="projectName"
                placeholder="e.g. Marketing Site"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="mt-1.5"
              />
            </div>
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
          </div>

          <div className="grid grid-cols-3 gap-3">
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
              <Label className="text-sm font-medium">Assignee</Label>
              <div className="mt-1.5">
                <AssigneeSelector
                  selectedAssignee={selectedAssignee}
                  selectedAssigneeType={selectedAssigneeType}
                  employees={employees}
                  teams={teams}
                  onSelect={(id: string, type: string) => {
                    setSelectedAssignee(id);
                    setSelectedAssigneeType(type as AssigneeType);
                  }}
                  onRemove={() => {
                    setSelectedAssignee(null);
                    setSelectedAssigneeType(null);
                  }}
                  onQuickAdd={(type) => router.push(type === "staff" ? "/staffs" : "/teams")}
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
              {isRepeatedTask && (
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
            <Textarea
              id="taskDescription"
              placeholder="Describe the task details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Attachments</Label>
            <div className="mt-1.5">
              <TableUpload onFilesChange={setUploadedFiles} compactImage={true} />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
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
