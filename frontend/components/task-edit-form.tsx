"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SaveIcon, Loader2Icon, AlertCircleIcon, ListTodoIcon } from "lucide-react";

type Task = {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
};

const statusOptions = [
  { value: "todo", label: "To Do", color: "bg-gray-400" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { value: "review", label: "Review", color: "bg-[#5f7d56]" },
  { value: "done", label: "Done", color: "bg-emerald-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface TaskEditFormProps {
  task: Task;
  onSave: (updated: Task) => void;
  onCancel: () => void;
}

export function TaskEditForm({ task, onSave, onCancel }: TaskEditFormProps) {
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Task>({ ...task });

  const updateField = (field: keyof Task, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    onSave(formData);
  };

  return (
    <>
      <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
        <DialogTitle className="flex items-center gap-2 text-lg">
          <ListTodoIcon className="size-5" />
          Edit Task
        </DialogTitle>
        <DialogDescription>
          Update the task details below.
        </DialogDescription>
      </DialogHeader>

      {formError && (
        <div className="mx-6 mb-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="px-6 pb-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="col-span-full">
          <Label htmlFor="title" className="text-xs">Task Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Enter task title"
            className="mt-1 h-9"
          />
        </div>

        <div className="col-span-full">
          <Label htmlFor="description" className="text-xs">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Enter task description"
            rows={2}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="status" className="text-xs">Status</Label>
          <Select value={formData.status} onValueChange={(v) => updateField("status", v)}>
            <SelectTrigger id="status" className="mt-1 h-9">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${opt.color}`} />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority" className="text-xs">Priority</Label>
          <Select value={formData.priority} onValueChange={(v) => updateField("priority", v)}>
            <SelectTrigger id="priority" className="mt-1 h-9">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="assigneeName" className="text-xs">Assignee</Label>
          <Input
            id="assigneeName"
            value={formData.assigneeName}
            onChange={(e) => updateField("assigneeName", e.target.value)}
            placeholder="Name"
            className="mt-1 h-9"
          />
        </div>

        <div>
          <Label htmlFor="assigneeId" className="text-xs">Assignee ID</Label>
          <Input
            id="assigneeId"
            value={formData.assigneeId}
            onChange={(e) => updateField("assigneeId", e.target.value)}
            placeholder="ID"
            className="mt-1 h-9"
          />
        </div>

        <div>
          <Label htmlFor="creatorName" className="text-xs">Creator</Label>
          <Input
            id="creatorName"
            value={formData.creatorName}
            onChange={(e) => updateField("creatorName", e.target.value)}
            placeholder="Creator name"
            className="mt-1 h-9"
          />
        </div>

        <div>
          <Label htmlFor="dueDate" className="text-xs">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate ? new Date(formData.dueDate).toISOString().split("T")[0] : ""}
            onChange={(e) => updateField("dueDate", e.target.value ? new Date(e.target.value).toISOString() : "")}
            className="mt-1 h-9"
          />
        </div>
      </div>

      <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={submitting || !formData.title.trim()}>
          {submitting ? <Loader2Icon className="size-4 animate-spin" /> : <><SaveIcon className="size-3.5 mr-1.5" />Save Changes</>}
        </Button>
      </DialogFooter>
    </>
  );
}
