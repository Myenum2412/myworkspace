"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PencilIcon, AlignLeftIcon, UserIcon, CalendarIcon, HashIcon, ListTodoIcon } from "lucide-react";

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

const statusColors: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700 border-gray-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  review: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const statusDots: Record<string, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-amber-500",
  review: "bg-blue-500",
  done: "bg-emerald-500",
  cancelled: "bg-red-500",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-50 text-blue-600",
  high: "bg-orange-50 text-orange-600",
  urgent: "bg-red-50 text-red-600",
};

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
        <Icon className="size-3.5" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

function PersonRow({ name, avatar, role }: { name: string; avatar: string; role: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="size-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-background">
        {avatar ? (
          <img src={avatar} alt={name} className="size-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-muted-foreground">
            {(name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium">{name || "Unassigned"}</p>
        <p className="text-[11px] text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}

export function TaskDetailedView({
  task,
  onEdit,
}: {
  task: Task;
  onEdit?: (t: Task) => void;
}) {
  return (
    <>
      <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
        <DialogTitle className="flex items-center gap-2 text-xl">
          <ListTodoIcon className="size-5" />
          {task.title}
        </DialogTitle>
        <DialogDescription>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[task.status] || ""}`}>
              <span className={`size-1.5 rounded-full ${statusDots[task.status] || "bg-gray-400"}`} />
              {task.status.replace(/_/g, " ")}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColors[task.priority] || ""}`}>
              {task.priority}
            </span>
          </div>
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-5">
        <Section icon={AlignLeftIcon} title="Description">
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-sm leading-relaxed">{task.description || <span className="text-muted-foreground italic">No description provided.</span>}</p>
          </div>
        </Section>

        <Separator />

        <Section icon={UserIcon} title="People">
          <div className="space-y-2">
            <PersonRow name={task.assigneeName} avatar={task.assigneeAvatar} role="Assignee" />
            <PersonRow name={task.creatorName} avatar="" role="Created By" />
          </div>
        </Section>

        <Separator />

        <Section icon={CalendarIcon} title="Dates">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Due Date" value={task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "No due date"} />
            <InfoCard label="Created" value={new Date(task.createdAt).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })} />
          </div>
        </Section>

        <Separator />

        <Section icon={HashIcon} title="Details">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Task ID" value={`#${task._id.slice(-8)}`} />
            <InfoCard label="Status" value={task.status.replace(/_/g, " ")} />
            <InfoCard label="Priority" value={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} />
            <InfoCard label="Assignee" value={task.assigneeName || "Unassigned"} />
          </div>
        </Section>
      </div>

      <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2">
        {onEdit && (
          <Button variant="outline" onClick={() => onEdit(task)}>
            <PencilIcon className="size-3.5 mr-1.5" />
            Edit Task
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
