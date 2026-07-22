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
import { Separator } from "@/components/ui/separator";
import {
  PlusIcon,
  AlertCircleIcon,
  UsersIcon,
  XIcon,
  FileIcon,
  UploadIcon,
  ArrowLeftIcon,
  SearchIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
    <div className="rounded-sm border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-sm bg-primary/10">
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
        <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-sm bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
          <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      <div className="px-4 sm:px-6 py-5 space-y-6">

        <fieldset className="rounded-sm border p-4 space-y-4">
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

        <fieldset className="rounded-sm border p-4 space-y-4">
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
                      <label key={m.id} className="flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-muted">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => {
                            onProjectMembersChange(
                              checked ? projectMembers.filter((id) => id !== m.id) : [...projectMembers, m.id]
                            );
                          }}
                        />
                        <div className="size-7 rounded-sm bg-muted flex items-center justify-center text-[10px] font-medium shrink-0 overflow-hidden">
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

        <fieldset className="rounded-sm border p-4 space-y-4">
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

        <fieldset className="rounded-sm border p-4 space-y-4">
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

        <fieldset className="rounded-sm border p-4 space-y-4">
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
                    className={`size-8 rounded-sm ring-offset-2 ring-offset-background transition-all ${
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
                className="size-9 cursor-pointer rounded-sm border border-border bg-transparent p-0.5"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-sm border p-4 space-y-4">
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
              className="mt-1 border-2 border-dashed border-muted-foreground/20 rounded-sm p-5 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              {projectAttachment ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-sm bg-primary/10">
                    <FileIcon className="size-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{projectAttachment.name}</p>
                    <p className="text-xs text-muted-foreground">{(projectAttachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onProjectAttachmentChange(null); }}
                    className="ml-auto p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
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
              <span className="size-4 animate-spin rounded-sm border-2 border-background border-t-transparent" />
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
  editPriority,
  onEditPriorityChange,
  editCategory,
  onEditCategoryChange,
  editStartDate,
  onEditStartDateChange,
  editBudget,
  onEditBudgetChange,
  editHealth,
  onEditHealthChange,
  editMembers,
  onEditMembersChange,
  editMemberSearch,
  onEditMemberSearchChange,
  editAttachment,
  onEditAttachmentChange,
  filteredMembers,
  clientList,
  colors,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: ProjectEditFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-hidden">
      {formError && (
        <div className="mx-6 mt-4 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {formError}
        </div>
      )}

      <div className="flex items-center gap-3 px-6 shrink-0">
        <Button variant="ghost" size="icon" className="size-8" onClick={onCancel}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Edit Project</h2>
          <p className="text-sm text-muted-foreground">Update project details</p>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden px-1">
        <ScrollArea className="h-full px-5">
          <div className="space-y-8 py-6 max-w-4xl mx-auto">
            <fieldset className="rounded-sm border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">General</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Project Name</Label>
                  <Input value={editName} onChange={(e) => onEditNameChange(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Client</Label>
                  <Select value={editClient} onValueChange={onEditClientChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientList.length === 0 ? (
                        <div className="px-2 py-4 text-center text-xs text-muted-foreground">No clients</div>
                      ) : (
                        clientList.map((c) => (
                          <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => onEditDescriptionChange(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Deadline</Label>
                  <Input type="date" value={editDeadline} onChange={(e) => onEditDeadlineChange(e.target.value)} />
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

            <Separator />

            <fieldset className="rounded-sm border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">Timeline &amp; Team</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Input type="date" value={editStartDate} onChange={(e) => onEditStartDateChange(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Deadline</Label>
                  <Input type="date" value={editDeadline} onChange={(e) => onEditDeadlineChange(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Health</Label>
                  <Select value={editHealth} onValueChange={onEditHealthChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on-track">On Track</SelectItem>
                      <SelectItem value="at-risk">At Risk</SelectItem>
                      <SelectItem value="delayed">Delayed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Select value={editPriority} onValueChange={onEditPriorityChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Team Members</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-sm font-normal">
                        <UsersIcon className="size-3.5 mr-2 text-muted-foreground" />
                        {editMembers.length === 0
                          ? "Select team members"
                          : `${editMembers.length} member${editMembers.length > 1 ? "s" : ""} selected`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2" align="start">
                      <div className="relative mb-2">
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search members..."
                          className="pl-8 h-8 text-sm bg-white"
                          value={editMemberSearch}
                          onChange={(e) => onEditMemberSearchChange(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredMembers.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No employees available</p>
                        ) : (
                          filteredMembers.map((m) => (
                            <label
                              key={m.id}
                              className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer text-sm"
                            >
                              <Checkbox
                                checked={editMembers.includes(m.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    onEditMembersChange([...editMembers, m.id]);
                                  } else {
                                    onEditMembersChange(editMembers.filter((id) => id !== m.id));
                                  }
                                }}
                              />
                              <span className="truncate">{m.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </fieldset>

            <Separator />

            <fieldset className="rounded-sm border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">Budget &amp; Category</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select value={editCategory} onValueChange={onEditCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Budget ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editBudget}
                    onChange={(e) => onEditBudgetChange(Number(e.target.value))}
                  />
                </div>
              </div>
            </fieldset>

            <Separator />

            <fieldset className="rounded-sm border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">Access &amp; Branding</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label className="text-xs text-muted-foreground">Color</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2 flex-wrap">
                      {colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => onEditColorChange(c)}
                          className={cn(
                            "size-7 rounded-sm ring-offset-2 ring-offset-background transition-all",
                            editColor === c ? "ring-2 ring-foreground scale-110" : ""
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => onEditColorChange(e.target.value)}
                      className="size-8 cursor-pointer rounded-sm border border-border bg-transparent p-0.5"
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            <Separator />

            <fieldset className="rounded-sm border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">Attachments</legend>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Project File</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) onEditAttachmentChange(file);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  className="mt-1 border-2 border-dashed border-muted-foreground/20 rounded-sm p-5 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  {editAttachment ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-sm bg-primary/10">
                        <FileIcon className="size-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{editAttachment.name}</p>
                        <p className="text-xs text-muted-foreground">{(editAttachment.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEditAttachmentChange(null); }}
                        className="ml-auto p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
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
                    if (file) onEditAttachmentChange(file);
                    e.target.value = "";
                  }}
                  disabled={submitting}
                />
              </div>
            </fieldset>
          </div>
        </ScrollArea>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-4 border-t bg-muted/10">
        <Button variant="ghost" onClick={onCancel} className="order-2 sm:order-1">
          Cancel
        </Button>
        <Button className="bg-primary hover:bg-primary/80 w-full sm:w-32 touch-target order-1 sm:order-2" onClick={onSubmit} disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
