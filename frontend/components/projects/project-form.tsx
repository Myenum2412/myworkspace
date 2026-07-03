"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusIcon, AlertCircleIcon, UsersIcon, XIcon } from "lucide-react";
import type { ProjectCreateFormProps, ProjectEditFormProps } from "./project-types";

export function ProjectCreateForm({
  open,
  onOpenChange,
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
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PlusIcon className="size-5" />
            New Project
          </DialogTitle>
          <DialogDescription>
            Create a new project for your organization.
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="mx-6 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircleIcon className="size-4 shrink-0" />
            {formError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-5">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              Project Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="projectName" className="text-sm">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="e.g. Website Redesign"
                  value={projectName}
                  onChange={(e) => onProjectNameChange(e.target.value)}
                  disabled={submitting}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="client" className="text-sm">Client *</Label>
                <Select value={selectedClient} onValueChange={onSelectedClientChange} disabled={submitting}>
                  <SelectTrigger id="client" className="mt-1">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientList.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description" className="text-sm">Description</Label>
              <textarea
                id="description"
                placeholder="Brief project description"
                value={projectDescription}
                onChange={(e) => onProjectDescriptionChange(e.target.value)}
                disabled={submitting}
                rows={2}
                className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              Timeline & Team
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="deadline" className="text-sm">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={projectDeadline}
                  onChange={(e) => onProjectDeadlineChange(e.target.value)}
                  disabled={submitting}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="members" className="text-sm">Team Members</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="mt-1 w-full justify-start font-normal" disabled={submitting}>
                      <UsersIcon className="mr-2 size-4 shrink-0" />
                      {projectMembers.length === 0
                        ? "Select team members"
                        : `${projectMembers.length} member${projectMembers.length > 1 ? "s" : ""} selected`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="start">
                    <div className="relative mb-2">
                      <Input
                        placeholder="Search members..."
                        value={memberSearch}
                        onChange={(e) => onMemberSearchChange(e.target.value)}
                        className="pl-8"
                      />
                      <svg
                        className="absolute left-2.5 top-2.5 size-4 text-muted-foreground"
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
                            <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium shrink-0 overflow-hidden">
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
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              Branding
            </h3>
            <div>
              <Label className="text-sm">Color</Label>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex gap-2 flex-wrap">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onProjectColorChange(c)}
                      disabled={submitting}
                      className={`size-7 rounded-full ring-offset-2 ring-offset-background transition-all ${
                        projectColor === c ? "ring-2 ring-foreground scale-110" : ""
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
                  className="size-8 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 shrink-0 flex gap-2 sm:gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!projectName || !selectedClient || submitting} onClick={onSubmit}>
            {submitting ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
            <div>
              <Label className="text-sm">Project Name</Label>
              <Input value={editName} onChange={(e) => onEditNameChange(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Client</Label>
              <Input value={editClient} onChange={(e) => onEditClientChange(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <textarea
                value={editDescription}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                rows={2}
                className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
            <div>
              <Label className="text-sm">Deadline</Label>
              <Input type="date" value={editDeadline} onChange={(e) => onEditDeadlineChange(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Access</Label>
                <Select value={editAccess} onValueChange={(v) => onEditAccessChange(v as "Public" | "Private")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Public">Public</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Status</Label>
                <Select value={editStatus} onValueChange={(v) => onEditStatusChange(v as "Active" | "Inactive")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm">Color</Label>
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
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 pb-6 pt-2 shrink-0 flex gap-2 sm:gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1" onClick={onSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
