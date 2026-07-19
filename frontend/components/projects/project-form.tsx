"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PlusIcon,
  AlertCircleIcon,
  UsersIcon,
  XIcon,
  FileIcon,
  UploadIcon,
} from "lucide-react";
import type { ProjectCreateFormProps, ProjectEditFormProps } from "./project-types";

export function ProjectCreateForm({
  projectName,
  onProjectNameChange,
  selectedClient,
  onSelectedClientChange,
  projectDescription,
  onProjectDescriptionChange,
  projectDeadline,
  onProjectDeadlineChange,
  projectColor,
  onProjectColorChange,
  projectMembers,
  onProjectMembersChange,
  projectPriority = "medium",
  onProjectPriorityChange,
  projectCategory = "",
  onProjectCategoryChange,
  projectStartDate = "",
  onProjectStartDateChange,
  projectBudget = 0,
  onProjectBudgetChange,
  projectAttachment,
  onProjectAttachmentChange,
  projectAccess,
  onProjectAccessChange,
  projectHealth,
  onProjectHealthChange,
  submitting,
  formError,
  clientList,
  filteredMembers,
  memberSearch,
  onMemberSearchChange,
  colors,
  onSubmit,
  onCancel,
}: ProjectCreateFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <PlusIcon className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">New Project</h2>
            <p className="text-sm text-muted-foreground">Fill in the details below to create a new project.</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} disabled={submitting} className="size-8">
          <XIcon className="size-4" />
        </Button>
      </div>

      {formError && (
        <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
          <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      <div className="px-4 sm:px-6 py-5 space-y-6">

        <fieldset className="rounded-xl border p-4 space-y-4">
          <legend className="text-sm font-semibold px-2">Basic Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Project Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder=""
                value={projectName}
                onChange={(e) => onProjectNameChange(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Client <span className="text-destructive">*</span></Label>
              <Select value={selectedClient} onValueChange={onSelectedClientChange} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  {clientList.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              placeholder=""
              value={projectDescription}
              onChange={(e) => onProjectDescriptionChange(e.target.value)}
              disabled={submitting}
              rows={2}
            />
          </div>
        </fieldset>

        <fieldset className="rounded-xl border p-4 space-y-4">
          <legend className="text-sm font-semibold px-2">Timeline & Team</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={projectStartDate}
                onChange={(e) => onProjectStartDateChange(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Deadline</Label>
              <Input
                type="date"
                value={projectDeadline}
                onChange={(e) => onProjectDeadlineChange(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Team Members</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal" disabled={submitting}>
                  <UsersIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
                  {projectMembers.length === 0
                    ? "Select team members"
                    : `${projectMembers.length} member${projectMembers.length > 1 ? "s" : ""} selected`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="start">
                <div className="relative mb-2">
                  <Input
                    placeholder=""
                    value={memberSearch}
                    onChange={(e) => onMemberSearchChange(e.target.value)}
                    className="pl-8 h-8"
                  />
                  <svg
                    className="absolute left-2.5 top-2 size-4 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {memberSearch ? "No matching members" : "No employees available"}
                    </p>
                  ) : filteredMembers.map((m) => {
                    const checked = projectMembers.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => {
                            onProjectMembersChange(
                              checked ? projectMembers.filter((id) => id !== m.id) : [...projectMembers, m.id]
                            );
                          }}
                        />
                        <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0 overflow-hidden">
                          {m.image ? (
                            <img src={m.image} alt={m.name} className="size-full object-cover" />
                          ) : (
                            <span>{m.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border p-4 space-y-4">
          <legend className="text-sm font-semibold px-2">Classification</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={projectPriority} onValueChange={onProjectPriorityChange} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={projectCategory} onValueChange={onProjectCategoryChange} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border p-4 space-y-4">
          <legend className="text-sm font-semibold px-2">Budget & Planning</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Budget ($)</Label>
              <Input
                type="number"
                min="0"
                placeholder=""
                value={projectBudget || ""}
                onChange={(e) => onProjectBudgetChange(e.target.value ? Number(e.target.value) : 0)}
                disabled={submitting}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border p-4 space-y-4">
          <legend className="text-sm font-semibold px-2">Branding</legend>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Project Color</Label>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex gap-2 flex-wrap">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onProjectColorChange(c)}
                    disabled={submitting}
                    className={`size-8 rounded-full ring-offset-2 ring-offset-background transition-all ${
                      projectColor === c ? "ring-2 ring-foreground scale-110 shadow-md" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={projectColor}
                onChange={(e) => onProjectColorChange(e.target.value)}
                disabled={submitting}
                className="size-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border p-4 space-y-4">
          <legend className="text-sm font-semibold px-2">Attachments</legend>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Project File</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) onProjectAttachmentChange(file);
              }}
              onDragOver={(e) => e.preventDefault()}
              className="mt-1 border-2 border-dashed border-muted-foreground/20 rounded-lg p-5 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              {projectAttachment ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileIcon className="size-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{projectAttachment.name}</p>
                    <p className="text-xs text-muted-foreground">{(projectAttachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onProjectAttachmentChange(null); }}
                    className="ml-auto p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadIcon className="size-8 mx-auto text-muted-foreground/40 group-hover:text-primary/40 transition-colors" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">PDF, DOC, XLS, PNG, JPG up to 10MB</p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onProjectAttachmentChange(file);
                e.target.value = "";
              }}
              disabled={submitting}
            />
          </div>
        </fieldset>

      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={submitting} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button disabled={!projectName || !selectedClient || submitting} onClick={onSubmit} className="w-full sm:w-auto touch-target">
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Creating...
            </span>
          ) : (
            "Create Project"
          )}
        </Button>
      </div>
    </div>
  );
}

export function ProjectEditForm({
  open,
  onOpenChange,
  editName,
  onEditNameChange,
  editClient,
  onEditClientChange,
  editColor,
  onEditColorChange,
  editAccess,
  onEditAccessChange,
  editStatus,
  onEditStatusChange,
  editDescription,
  onEditDescriptionChange,
  editDeadline,
  onEditDeadlineChange,
  colors,
  onSubmit,
  onCancel,
}: ProjectEditFormProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(o); }}>
      <DialogContent className="p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            Edit Project
          </DialogTitle>
          <DialogDescription>
            Update project details.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 py-3">
          <div className="space-y-4">
            <fieldset className="rounded-xl border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">General</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Project Name</Label>
                  <Input value={editName} onChange={(e) => onEditNameChange(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Client</Label>
                  <Input value={editClient} onChange={(e) => onEditClientChange(e.target.value)} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => onEditDescriptionChange(e.target.value)}
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Deadline</Label>
                  <Input type="date" value={editDeadline} onChange={(e) => onEditDeadlineChange(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Access</Label>
                  <Select value={editAccess} onValueChange={(v) => onEditAccessChange(v as "Public" | "Private")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">Public</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={editStatus} onValueChange={(v) => onEditStatusChange(v as "Active" | "Inactive")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </fieldset>
            <fieldset className="rounded-xl border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">Branding</legend>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Color</Label>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex gap-2 flex-wrap">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => onEditColorChange(c)}
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
                    onChange={(e) => onEditColorChange(e.target.value)}
                    className="size-8 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                  />
                </div>
              </div>
            </fieldset>
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 pb-6 pt-2 shrink-0 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:flex-1 touch-target" onClick={onCancel}>Cancel</Button>
          <Button className="w-full sm:flex-1 touch-target" onClick={onSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
