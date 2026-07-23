"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FolderKanbanIcon, PlusIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { createProjectAction } from "@/actions/projects";

type StaffMember = {
  _id: string;
  name: string;
  email: string;
  role: string;
  image: string;
};

type Project = {
  id: string;
  name: string;
  description: string;
  deadline: string | null;
  priority: string;
  color: string;
  status: string;
  members: string[];
  createdAt: string;
};

const PROJECT_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-200 text-gray-800",
  high: "bg-orange-100 text-orange-600",
  critical: "bg-red-100 text-red-600",
};
const statusStyles: Record<string, string> = {
  Active: "bg-green-100 text-green-600",
  Inactive: "bg-gray-100 text-gray-500",
};

export default function StaffProjects({
  projects: initialProjects,
  members,
}: {
  projects: Project[];
  members: StaffMember[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("medium");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setDeadline("");
    setPriority("medium");
    setColor(PROJECT_COLORS[0]);
    setSelectedMembers(new Set());
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      if (deadline) formData.append("deadline", deadline);
      formData.append("priority", priority);
      formData.append("color", color);
      selectedMembers.forEach((id) => formData.append("members", id));
      const result = await createProjectAction(formData);
      if (result.success) {
        setOpen(false);
        resetForm();
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderKanbanIcon className="size-4" />
            Projects ({projects.length})
          </CardTitle>
          <Button size="sm" onClick={() => { resetForm(); setOpen(true); }}>
            <PlusIcon className="size-4 mr-1" />
            Add Project
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No projects yet
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className="block size-4 rounded-full" style={{ backgroundColor: p.color }} />
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge className={`font-medium ${priorityStyles[p.priority] || priorityStyles.medium}`}>
                        {p.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`font-medium ${statusStyles[p.status] || statusStyles.Active}`}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.deadline ? new Date(p.deadline).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter project name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`size-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Team Members</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {members.map((m) => (
                  <label key={m._id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                    <Checkbox
                      checked={selectedMembers.has(m._id)}
                      onCheckedChange={(chk) => {
                        const next = new Set(selectedMembers);
                        if (chk) next.add(m._id);
                        else next.delete(m._id);
                        setSelectedMembers(next);
                      }}
                    />
                    <span>{m.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{m.role}</span>
                  </label>
                ))}
                {members.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2 text-center">No members available</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || creating}>
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
