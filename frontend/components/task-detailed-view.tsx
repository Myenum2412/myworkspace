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
  SaveIcon, UsersIcon,
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
    { value: "assigned", label: "Assigned", icon: UserCheckIcon, color: "text-blue-500" },
    { value: "pending", label: "Pending", icon: ClockIcon, color: "text-yellow-500" },
    { value: "in_progress", label: "In Progress", icon: ClockIcon, color: "text-blue-500" },
    { value: "completed", label: "Completed", icon: CheckCircleIcon, color: "text-green-500" },
    { value: "hold", label: "Hold", icon: AlertCircleIcon, color: "text-orange-500" },
    { value: "cancelled", label: "Cancelled", icon: XCircleIcon, color: "text-red-500" },
    { value: "reopened", label: "Reopened", icon: AlertCircleIcon, color: "text-purple-500" },
  ],
  team: [
    { value: "pending", label: "Pending", icon: ClockIcon, color: "text-yellow-500" },
    { value: "in_progress", label: "In Progress", icon: ClockIcon, color: "text-blue-500" },
    { value: "submitted", label: "Submitted", icon: AlertCircleIcon, color: "text-purple-500" },
    { value: "approved", label: "Approved", icon: CheckCircleIcon, color: "text-green-500" },
    { value: "completed", label: "Completed", icon: CheckCircleIcon, color: "text-green-500" },
    { value: "rejected", label: "Rejected", icon: XCircleIcon, color: "text-red-500" },
    { value: "cancelled", label: "Cancelled", icon: XCircleIcon, color: "text-red-500" },
  ],
  upcoming: [
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
  low: "bg-slate-50 text-slate-600 border-slate-200/60 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800/50",
  medium: "bg-blue-50/50 text-blue-600 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/50",
  high: "bg-amber-50/60 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50",
  urgent: "bg-red-50/60 text-red-650 border-red-200/60 font-semibold dark:bg-red-950/30 dark:text-red-450 dark:border-red-800/50",
};

const priorityIcons: Record<string, React.FC<any>> = {
  low: CircleIcon,
  medium: ActivityIcon,
  high: AlertCircleIcon,
  urgent: AlertCircleIcon,
};

function Section({ icon: Icon, title, children, rightAction }: { icon: any; title: string; children: React.ReactNode, rightAction?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-slate-400 dark:text-slate-500 shrink-0" />}
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {title}
          </h3>
        </div>
        {rightAction}
      </div>
      {children}
    </div>
  );
}

function PersonBadge({ name, avatar, role }: { name?: string; avatar?: string; role: string }) {
  const initials = (name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-900/20 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all duration-200">
      <Avatar className="size-9 border border-slate-205 dark:border-slate-800 shrink-0 shadow-sm">
        {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">{role}</span>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{name || "Unassigned"}</span>
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
    assigned: 10, pending: 20, in_progress: 40,
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
    <div className="flex flex-col sm:flex-row w-full h-full overflow-hidden bg-background">
      <div className="flex-1 min-w-0 overflow-y-auto">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/40">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-indigo-100/50 dark:border-indigo-900/30">
              <FolderIcon className="!size-3.5 text-indigo-550 shrink-0" />
              {task.project || "General Workspace"}
            </span>
            <Badge variant="secondary" className="bg-slate-50 text-slate-600 dark:bg-slate-900/50 dark:text-slate-350 border border-slate-200/50 dark:border-slate-800 text-xs px-2.5 py-0.5 font-medium rounded-md">
              {typeBadge.label}
            </Badge>
            <Badge className={`${priorityStyles[task.priority.toLowerCase()] || "bg-slate-100 text-slate-700"} text-xs px-2.5 py-0.5 font-semibold rounded-md flex items-center gap-1 border`}>
              <PriorityIcon className="size-3 shrink-0" />
              <span className="capitalize">{task.priority} Priority</span>
            </Badge>
            {task.dueDate && (() => {
              const now = new Date();
              const due = new Date(task.dueDate!);
              const diffMs = due.getTime() - now.getTime();
              const COMPLETED = new Set(["completed", "done", "cancelled", "closed"]);
              const isOverdue = diffMs < 0 && !COMPLETED.has(task.status);
              const isDueSoon = diffMs > 0 && diffMs <= 86400000 && !COMPLETED.has(task.status);
              return (
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 ml-1">
                  <CalendarIcon className="size-3.5" />
                  Due {new Date(task.dueDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {isOverdue && (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200/80 text-[10px] px-2 py-0 gap-1 rounded-md">
                      <AlertCircleIcon className="size-2.5" /> Overdue
                    </Badge>
                  )}
                  {isDueSoon && (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-2 py-0 gap-1 rounded-md">
                      <ClockIcon className="size-2.5" /> Due Soon
                    </Badge>
                  )}
                </span>
              );
            })()}
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-5">
            {task.title}
          </h1>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40">
            <div className="flex flex-col gap-1.5 shrink-0">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</label>
              <Select value={task.status} onValueChange={handleStatusChange} disabled={updating}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 font-semibold text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm">
                  {updating ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2Icon className="size-4 animate-spin" /> Updating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`size-4 ${activeStatusOpt?.color}`} />
                      <span className="text-slate-800 dark:text-slate-200">{activeStatusOpt?.label}</span>
                    </div>
                  )}
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {typeOptions.map((opt) => {
                    const OptIcon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value} className="rounded-lg my-0.5">
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

            <div className="flex flex-col gap-1.5 flex-1 max-w-none sm:max-w-xs sm:ml-auto">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <span>Progress</span>
                <span className="text-slate-850 dark:text-slate-250 font-bold">{progress}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200/50 dark:bg-slate-850/80 rounded-full overflow-hidden border border-slate-200/20 dark:border-slate-800/40">
                <div
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                    task.status === "completed" || task.status === "approved" || task.status === "closed" ? "from-emerald-400 to-green-500" :
                    task.status === "rejected" || task.status === "cancelled" ? "from-orange-400 to-red-500" : "from-blue-500 to-indigo-600"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:ml-4">
              {taskType === "team" && task.status === "in_progress" && (
                <Button size="sm" variant="default" className="h-9 px-4 rounded-xl text-xs font-semibold shadow-sm" onClick={() => handleAction("submit-verification")} disabled={actionLoading}>
                  {actionLoading ? <Loader2Icon className="size-3.5 animate-spin mr-1.5" /> : <AlertCircleIcon className="size-3.5 mr-1.5" />}
                  Submit for Verification
                </Button>
              )}
              {taskType === "team" && task.status === "submitted" && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="default" className="h-9 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={() => {
                    const note = prompt("Approval note (optional):");
                    handleAction("approve", { note });
                  }} disabled={actionLoading}>
                    <CheckCircleIcon className="size-3.5 mr-1.5" />
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="h-9 px-4 rounded-xl text-xs font-semibold shadow-sm" onClick={() => {
                    const reason = prompt("Rejection reason (required):");
                    if (reason) handleAction("reject", { reason });
                  }} disabled={actionLoading}>
                    <XCircleIcon className="size-3.5 mr-1.5" />
                    Reject
                  </Button>
                </div>
              )}
              {taskType === "upcoming" && task.status === "scheduled" && (
                <Button size="sm" variant="default" className="h-9 px-4 rounded-xl text-xs font-semibold shadow-sm" onClick={() => handleAction("activate")} disabled={actionLoading}>
                  {actionLoading ? <Loader2Icon className="size-3.5 animate-spin mr-1.5" /> : <ClockIcon className="size-3.5 mr-1.5" />}
                  Activate Now
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-6 py-6 space-y-7">

          <Section icon={AlignLeftIcon} title="Description">
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 p-4 sm:p-5 shadow-sm">
              {task.description ? (
                <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: task.description }} />
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground opacity-60">
                  <AlignLeftIcon className="size-6 mb-2 text-slate-400" />
                  <p className="text-sm italic">No description provided for this task.</p>
                </div>
              )}
            </div>
          </Section>

          <Section icon={UserIcon} title="People">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
              <div className="rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-3 text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <UserCheckIcon className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-sm">Task Approved</span>
                  </div>
                  <span className="text-[10px] font-medium opacity-80 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-355 px-2.5 py-0.5 rounded-md sm:ml-auto">
                    {task.approvedAt ? new Date(task.approvedAt).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "long", day: "numeric" }) : ""}
                  </span>
                </div>
                {task.approvalNote && (
                  <div className="bg-white/80 dark:bg-slate-900/60 rounded-lg p-3 text-sm text-emerald-900 dark:text-emerald-250 border border-emerald-100/50 dark:border-emerald-900/30">
                    <span className="font-bold block text-[9px] uppercase tracking-widest opacity-60 mb-1">Note</span>
                    {task.approvalNote}
                  </div>
                )}
                {task.approverName && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-3 font-medium">Approved by <strong className="text-emerald-900 dark:text-emerald-200">{task.approverName}</strong></p>
                )}
              </div>
            </Section>
          )}

          {(task.status === "rejected" && task.rejectionReason) && (
            <Section icon={XCircleIcon} title="Rejection Details">
              <div className="rounded-xl border border-rose-100 dark:border-rose-950 bg-rose-50/30 dark:bg-rose-950/20 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-3 text-rose-800 dark:text-rose-350">
                  <div className="flex items-center gap-2">
                    <XCircleIcon className="size-4.5 text-rose-600 dark:text-rose-400" />
                    <span className="font-semibold text-sm">Task Rejected</span>
                  </div>
                  <span className="text-[10px] font-medium opacity-80 bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-350 px-2.5 py-0.5 rounded-md sm:ml-auto">
                    {task.rejectedAt ? new Date(task.rejectedAt).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "long", day: "numeric" }) : ""}
                  </span>
                </div>
                {task.rejectionReason && (
                  <div className="bg-white/80 dark:bg-slate-900/60 rounded-lg p-3 text-sm text-rose-900 dark:text-rose-250 border border-rose-100/50 dark:border-rose-900/30">
                    <span className="font-bold block text-[9px] uppercase tracking-widest opacity-60 mb-1">Reason</span>
                    {task.rejectionReason}
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section icon={ActivityIcon} title="Activity Timeline">
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 p-5 shadow-sm">
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-2.5 space-y-5 pb-1">
                <div className="relative pl-6">
                  <span className="absolute -left-[7px] top-1 size-3 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900 shadow-sm" />
                  <p className="text-sm font-semibold text-slate-850 dark:text-slate-200">Task Created</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(task.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="relative pl-6">
                  <span className="absolute -left-[7px] top-1 size-3 rounded-full bg-slate-400 ring-4 ring-white dark:ring-slate-900 shadow-sm" />
                  <p className="text-sm font-semibold text-slate-850 dark:text-slate-200">Assigned to {task.assigneeName || "Someone"}</p>
                  <p className="text-xs text-slate-500 mt-0.5">By {task.creatorName}</p>
                </div>
                {task.updatedAt && (
                  <div className="relative pl-6">
                    <span className="absolute -left-[7px] top-1 size-3 rounded-full bg-amber-500 ring-4 ring-white dark:ring-slate-900 shadow-sm" />
                    <p className="text-sm font-semibold text-slate-850 dark:text-slate-200">Last Activity</p>
                    <p className="text-xs text-slate-500 mt-0.5">
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
      <div className="w-full sm:w-[360px] shrink-0 flex flex-col border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800/40 h-full">
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
