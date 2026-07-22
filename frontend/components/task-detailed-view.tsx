"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  PencilIcon, AlignLeftIcon, UserIcon, CalendarIcon, HashIcon,
  ListTodoIcon, CheckCircleIcon, XCircleIcon, PaperclipIcon,
  ActivityIcon, AlertCircleIcon, ClockIcon, Loader2Icon,
  CircleIcon, CircleDashedIcon, FileTextIcon, UserCheckIcon,
  SaveIcon, FileEditIcon, UsersIcon,
} from "lucide-react";
import FolderIcon from "@mui/icons-material/Folder";
import { TaskChat } from "@/components/task-chat";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

type Employee = {
  id: string;
  firstName: string;
  lastName?: string;
  avatar?: string;
  role?: string;
};

export type Task = {
  _id: string;
  title: string;
  description?: string;
  type?: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  startDate?: string | null;
  scheduledDate?: string | null;
  activatedAt?: string | null;
  id?: string;
  orgId?: string;
  teamId?: string;
  teamName?: string;
  teamHeadName?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  creatorId?: string;
  creatorName?: string;
  createdAt: string;
  updatedAt?: string;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string | null;
  approvalNote?: string;
  rejectedBy?: string;
  rejectedAt?: string | null;
  rejectionReason?: string;
  project?: string;
  submittedAt?: string | null;
};

const STATUS_OPTIONS_BY_TYPE: Record<string, { value: string; label: string; icon: any; color: string }[]> = {
  individual: [
    { value: "draft", label: "Draft", icon: FileEditIcon, color: "text-gray-500" },
    { value: "assigned", label: "Assigned", icon: UserCheckIcon, color: "text-blue-500" },
    { value: "pending", label: "Pending", icon: ClockIcon, color: "text-yellow-500" },
    { value: "in_progress", label: "In Progress", icon: ClockIcon, color: "text-blue-500" },
    { value: "completed", label: "Completed", icon: CheckCircleIcon, color: "text-green-500" },
    { value: "hold", label: "Hold", icon: AlertCircleIcon, color: "text-orange-500" },
    { value: "cancelled", label: "Cancelled", icon: XCircleIcon, color: "text-red-500" },
    { value: "reopened", label: "Reopened", icon: AlertCircleIcon, color: "text-purple-500" },
  ],
  team: [
    { value: "draft", label: "Draft", icon: FileEditIcon, color: "text-gray-500" },
    { value: "pending", label: "Pending", icon: ClockIcon, color: "text-yellow-500" },
    { value: "in_progress", label: "In Progress", icon: ClockIcon, color: "text-blue-500" },
    { value: "submitted", label: "Submitted", icon: AlertCircleIcon, color: "text-purple-500" },
    { value: "approved", label: "Approved", icon: CheckCircleIcon, color: "text-green-500" },
    { value: "completed", label: "Completed", icon: CheckCircleIcon, color: "text-green-500" },
    { value: "rejected", label: "Rejected", icon: XCircleIcon, color: "text-red-500" },
    { value: "cancelled", label: "Cancelled", icon: XCircleIcon, color: "text-red-500" },
  ],
  upcoming: [
    { value: "draft", label: "Draft", icon: FileEditIcon, color: "text-gray-500" },
    { value: "scheduled", label: "Scheduled", icon: ClockIcon, color: "text-blue-500" },
    { value: "activated", label: "Activated", icon: UserCheckIcon, color: "text-green-500" },
    { value: "in_progress", label: "In Progress", icon: ClockIcon, color: "text-blue-500" },
    { value: "completed", label: "Completed", icon: CheckCircleIcon, color: "text-green-500" },
    { value: "cancelled", label: "Cancelled", icon: XCircleIcon, color: "text-red-500" },
  ],
};

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 border-transparent",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  urgent: "bg-red-50 text-red-700 border-red-200 font-bold",
};

const priorityIcons: Record<string, React.FC<any>> = {
  low: CircleIcon,
  medium: ActivityIcon,
  high: AlertCircleIcon,
  urgent: AlertCircleIcon,
};

function Section({ icon: Icon, title, children, rightAction }: { icon: any; title: string; children: React.ReactNode, rightAction?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {rightAction}
      </div>
      {children}
    </div>
  );
}

function PersonBadge({ name, avatar, role }: { name?: string; avatar?: string; role: string }) {
  return (
    <div className="flex items-center gap-2 border-b pb-2">
      <div className="size-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {avatar ? (
          <img src={avatar} alt={name} className="size-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-muted-foreground">
            {(name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{role}</span>
        <span className="text-sm font-medium text-foreground">{name || "Unassigned"}</span>
      </div>
    </div>
  );
}

const TYPE_BADGES: Record<string, { label: string }> = {
  individual: { label: "Individual" },
  team: { label: "Team" },
  upcoming: { label: "Upcoming" },
};

export function TaskDetailedView({
  task: initialTask,
  onEdit,
  sessionUserId,
  onTaskUpdate,
  onClose,
  editable,
}: {
  task: Task;
  onEdit?: (t: any) => void;
  sessionUserId?: string;
  onTaskUpdate?: (t: any) => void;
  onClose?: () => void;
  editable?: boolean;
}) {
  const [task, setTask] = useState<Task>(initialTask);
  const [updating, setUpdating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const taskType = task.type || "individual";
  const typeOptions = STATUS_OPTIONS_BY_TYPE[taskType] || STATUS_OPTIONS_BY_TYPE.individual;

  const progressMap: Record<string, number> = {
    draft: 0, assigned: 10, pending: 20, in_progress: 40,
    submitted: 60, approved: 80, completed: 100, closed: 100,
    published: 50, accepted: 80, scheduled: 20, activated: 40,
    hold: 20, cancelled: 100, rejected: 100, reopened: 20,
  };
  const progress = progressMap[task.status] ?? 0;

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await apiFetch(`/api/tasks/${task._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update status");
      }

      const finalTask = { ...task, status: newStatus };
      setTask(finalTask);
      onTaskUpdate?.(finalTask);
      toast.success("Task status updated");
    } catch (err: any) {
      toast.error(err.message || "Could not update status. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleAction = async (action: string, body?: Record<string, any>) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/tasks/${task._id}/${action}`, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to ${action}`);
      }
      toast.success(`Task ${action.replace("-", " ")}d successfully`);
      onTaskUpdate?.({ ...task, status: action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "submit-verification" ? "submitted" : action === "publish" ? "published" : action === "activate" ? "activated" : task.status });
      setTask((prev) => ({ ...prev, status: action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "submit-verification" ? "submitted" : action === "publish" ? "published" : action === "activate" ? "activated" : prev.status }));
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const activeStatusOpt = typeOptions.find(o => o.value === task.status);
  const StatusIcon = activeStatusOpt?.icon || CircleDashedIcon;
  const PriorityIcon = priorityIcons[task.priority] || CircleIcon;
  const typeBadge = TYPE_BADGES[taskType] || TYPE_BADGES.individual;

  return (
    <div className="flex flex-col sm:flex-row border rounded-lg overflow-hidden bg-background">
      <div className="flex-1 min-w-0 overflow-y-auto">

        {/* Header */}
        <div className="px-4 py-4 border-b">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground">Project / {task.project || "General Workspace"}</span>
            <span className="text-xs border rounded px-1.5 py-0.5">{typeBadge.label}</span>
            <span className="text-xs border rounded px-1.5 py-0.5">{task.priority} Priority</span>
            {task.dueDate && (() => {
              const now = new Date();
              const due = new Date(task.dueDate!);
              const diffMs = due.getTime() - now.getTime();
              const COMPLETED = new Set(["completed", "done", "cancelled", "closed"]);
              const isOverdue = diffMs < 0 && !COMPLETED.has(task.status);
              const isDueSoon = diffMs > 0 && diffMs <= 86400000 && !COMPLETED.has(task.status);
              return (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  Due {new Date(task.dueDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {isOverdue && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-[9px] px-1.5 py-0 gap-0.5">
                      <AlertCircleIcon className="size-2.5" /> Overdue
                    </Badge>
                  )}
                  {isDueSoon && (
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[9px] px-1.5 py-0 gap-0.5">
                      <ClockIcon className="size-2.5" /> Due Soon
                    </Badge>
                  )}
                </span>
              );
            })()}
          </div>

          <h1 className="text-lg font-semibold text-foreground mb-3">
            {task.title}
          </h1>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
              <Select value={task.status} onValueChange={handleStatusChange} disabled={updating}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 border font-medium">
                  {updating ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2Icon className="size-4 animate-spin" /> Updating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`size-4 ${activeStatusOpt?.color}`} />
                      <span>{activeStatusOpt?.label}</span>
                    </div>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => {
                    const OptIcon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <OptIcon className={`size-4 ${opt.color}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 flex-1 max-w-none sm:max-w-xs sm:ml-auto">
              <div className="flex justify-between items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    task.status === "completed" || task.status === "approved" || task.status === "closed" ? "bg-green-500" :
                    task.status === "rejected" || task.status === "cancelled" ? "bg-orange-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {taskType === "team" && task.status === "in_progress" && (
                <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => handleAction("submit-verification")} disabled={actionLoading}>
                  {actionLoading ? <Loader2Icon className="size-3 animate-spin mr-1" /> : <AlertCircleIcon className="size-3 mr-1" />}
                  Submit for Verification
                </Button>
              )}
              {taskType === "team" && task.status === "submitted" && (
                <>
                  <Button size="sm" variant="default" className="h-8 text-xs bg-green-600 hover:bg-green-700" onClick={() => {
                    const note = prompt("Approval note (optional):");
                    handleAction("approve", { note });
                  }} disabled={actionLoading}>
                    <CheckCircleIcon className="size-3 mr-1" />
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => {
                    const reason = prompt("Rejection reason (required):");
                    if (reason) handleAction("reject", { reason });
                  }} disabled={actionLoading}>
                    <XCircleIcon className="size-3 mr-1" />
                    Reject
                  </Button>
                </>
              )}
              {taskType === "upcoming" && task.status === "scheduled" && (
                <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => handleAction("activate")} disabled={actionLoading}>
                  {actionLoading ? <Loader2Icon className="size-3 animate-spin mr-1" /> : <ClockIcon className="size-3 mr-1" />}
                  Activate Now
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-4 py-4 space-y-6">

          <Section icon={AlignLeftIcon} title="Description">
            <div className="border p-4">
              {task.description ? (
                <div className="text-sm leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: task.description }} />
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-muted-foreground opacity-60">
                  <AlignLeftIcon className="size-6 mb-2" />
                  <p className="text-sm italic">No description provided for this task.</p>
                </div>
              )}
            </div>
          </Section>

          <Section icon={UserIcon} title="People">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PersonBadge name={task.assigneeName} avatar={task.assigneeAvatar} role="Assigned To" />
              <PersonBadge name={task.creatorName} avatar="" role="Created By" />
              {task.teamName && (
                <PersonBadge name={task.teamName} avatar="" role="Team" />
              )}
              {task.teamHeadName && (
                <PersonBadge name={task.teamHeadName} avatar="" role="Team Head" />
              )}
            </div>
          </Section>

          {(task.status === "approved" || (task.status === "completed" && task.approvedBy)) && (
            <Section icon={CheckCircleIcon} title="Approval Details">
              <div className="border border-green-200 bg-green-50 p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-2 text-green-800">
                  <div className="flex items-center gap-2">
                    <UserCheckIcon className="size-4" />
                    <span className="font-medium text-sm">Task Approved</span>
                  </div>
                  <span className="text-[11px] sm:text-xs opacity-70 bg-green-200/50 px-2 py-1 rounded-md sm:ml-auto">
                    {task.approvedAt ? new Date(task.approvedAt).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "long", day: "numeric" }) : ""}
                  </span>
                </div>
                {task.approvalNote && (
                  <div className="bg-white/60 rounded p-3 text-sm text-green-900 border border-green-100/50">
                    <span className="font-semibold block text-[11px] uppercase tracking-wider opacity-60 mb-1">Note</span>
                    {task.approvalNote}
                  </div>
                )}
                {task.approverName && (
                  <p className="text-xs text-green-700 mt-2">Approved by <strong>{task.approverName}</strong></p>
                )}
              </div>
            </Section>
          )}

          {(task.status === "rejected" && task.rejectionReason) && (
            <Section icon={XCircleIcon} title="Rejection Details">
              <div className="border border-orange-200 bg-orange-50 p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-2 text-orange-800">
                  <div className="flex items-center gap-2">
                    <XCircleIcon className="size-4" />
                    <span className="font-medium text-sm">Task Rejected</span>
                  </div>
                  <span className="text-[11px] sm:text-xs sm:ml-auto opacity-70 bg-orange-200/50 px-2 py-1 rounded-md">
                    {task.rejectedAt ? new Date(task.rejectedAt).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "long", day: "numeric" }) : ""}
                  </span>
                </div>
                {task.rejectionReason && (
                  <div className="bg-white/60 rounded p-3 text-sm text-red-900 border border-red-100/50">
                    <span className="font-semibold block text-[11px] uppercase tracking-wider opacity-60 mb-1">Reason</span>
                    {task.rejectionReason}
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section icon={ActivityIcon} title="Activity Timeline">
            <div className="border p-4">
              <div className="relative border-l border-gray-200 ml-3 space-y-4 pb-2">
                <div className="relative pl-6">
                  <span className="absolute -left-1.5 top-1 size-3 rounded-full bg-blue-500 ring-4 ring-white" />
                  <p className="text-sm font-medium text-gray-900">Task Created</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(task.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="relative pl-6">
                  <span className="absolute -left-1.5 top-1 size-3 rounded-full bg-gray-300 ring-4 ring-white" />
                  <p className="text-sm font-medium text-gray-900">Assigned to {task.assigneeName || "Someone"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">By {task.creatorName}</p>
                </div>
                {task.updatedAt && (
                  <div className="relative pl-6">
                    <span className="absolute -left-1.5 top-1 size-3 rounded-full bg-orange-400 ring-4 ring-white" />
                    <p className="text-sm font-medium text-gray-900">Last Activity</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(task.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Section>

        </div>
      </div>

      {/* Right Column - Comments / Chat */}
      <div className="w-full sm:w-[360px] shrink-0 flex flex-col border-t sm:border-t-0 sm:border-l">
        <TaskChat
          taskId={task._id}
          sessionUserId={sessionUserId || ""}
          onClose={onClose}
          taskTitle={task.title}
          taskStatus={task.status}
          taskPriority={task.priority}
          taskDueDate={task.dueDate}
          assigneeName={task.assigneeName}
          assigneeAvatar={task.assigneeAvatar}
          creatorName={task.creatorName}
        />
      </div>
    </div>
  );
}
