"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FilePreviewDialog } from "@/components/file-preview-dialog";
import { TaskChat } from "@/components/task-chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import {
  ActivityIcon,
  AlertCircleIcon,
  AlignLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  CircleIcon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  FolderIcon,
  HashIcon,
  ListTodoIcon,
  Loader2Icon,
  PaperclipIcon,
  PencilIcon,
  SaveIcon,
  UserCheckIcon,
  UserIcon,
  UsersIcon,
  XCircleIcon,
} from "@/lib/icons";

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
  assigneeIds?: string[];
  assignmentMode?: string;
  memberStatuses?: { userId: string; status: string; updatedAt: string }[];
};

const STATUS_OPTIONS_BY_TYPE: Record<
  string,
  { value: string; label: string; icon: any; color: string }[]
> = {
  individual: [
    { value: "assigned", label: "Assigned", icon: UserCheckIcon, color: "text-blue-500" },
    { value: "pending", label: "Pending", icon: ClockIcon, color: "text-yellow-500" },
    { value: "in_progress", label: "In Progress", icon: ClockIcon, color: "text-blue-500" },
    { value: "completed", label: "Completed", icon: CheckCircleIcon, color: "text-green-500" },
    { value: "hold", label: "Hold", icon: AlertCircleIcon, color: "text-orange-500" },
    { value: "cancelled", label: "Cancelled", icon: XCircleIcon, color: "text-red-500" },
    { value: "closed", label: "Closed", icon: XCircleIcon, color: "text-gray-500" },
    { value: "rejected", label: "Rejected", icon: XCircleIcon, color: "text-red-500" },
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
    { value: "closed", label: "Closed", icon: XCircleIcon, color: "text-gray-500" },
    { value: "reopened", label: "Reopened", icon: AlertCircleIcon, color: "text-purple-500" },
  ],
  common: [
    { value: "published", label: "Published", icon: CheckCircleIcon, color: "text-teal-500" },
    { value: "accepted", label: "Accepted", icon: CheckCircleIcon, color: "text-green-500" },
    { value: "in_progress", label: "In Progress", icon: ClockIcon, color: "text-blue-500" },
    { value: "completed", label: "Completed", icon: CheckCircleIcon, color: "text-green-500" },
    { value: "closed", label: "Closed", icon: XCircleIcon, color: "text-gray-500" },
  ],
  upcoming: [
    { value: "scheduled", label: "Scheduled", icon: ClockIcon, color: "text-blue-500" },
    { value: "activated", label: "Activated", icon: UserCheckIcon, color: "text-green-500" },
    { value: "in_progress", label: "In Progress", icon: ClockIcon, color: "text-blue-500" },
    { value: "completed", label: "Completed", icon: CheckCircleIcon, color: "text-green-500" },
    { value: "cancelled", label: "Cancelled", icon: XCircleIcon, color: "text-red-500" },
    { value: "closed", label: "Closed", icon: XCircleIcon, color: "text-gray-500" },
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
  medium:
    "bg-blue-50/50 text-blue-600 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/50",
  high: "bg-amber-50/60 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50",
  urgent:
    "bg-red-50/60 text-red-650 border-red-200/60 font-semibold dark:bg-red-950/30 dark:text-red-450 dark:border-red-800/50",
};

const priorityIcons: Record<string, React.FC<any>> = {
  low: CircleIcon,
  medium: ActivityIcon,
  high: AlertCircleIcon,
  urgent: AlertCircleIcon,
};

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${sizes[i]}`;
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function DetailItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: any;
  label: string;
  value?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className || ""}`}>
      <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {Icon && <Icon className="size-3 shrink-0" />}
        {label}
      </dt>
      <dd
        className="text-sm font-medium text-foreground min-w-0 truncate"
        title={typeof value === "string" ? value : undefined}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  rightAction,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-muted-foreground shrink-0" />}
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
    <div className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 transition-colors">
      <Avatar className="size-9 border border-border shrink-0 shadow-sm">
        {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1.5">
          {role}
        </span>
        <span className="text-sm font-semibold text-foreground truncate">
          {name || "Unassigned"}
        </span>
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
  const { data: session } = useSession();
  const currentUserId = sessionUserId || session?.user?.id || (session?.user as any)?.userId || "";

  const [task, setTask] = useState<Task>(initialTask);
  const [updating, setUpdating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState<
    Array<{ id: string; originalName: string; size: number; mimeType: string; createdAt: string }>
  >([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: string;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/employees", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const employeesList = data.employees || data.data || data || [];
        setEmployees(
          employeesList.map((e: any) => ({
            id: e.id,
            firstName: e.firstName || e.name || "Unknown",
            lastName: e.lastName || "",
            avatar: e.avatar || "",
            role: e.designation || e.role || "",
          })),
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const taskId = (task as any)._id || (task as any).id || "";
    setAttachmentsLoading(true);
    fetch(
      `/api/files?orgId=${encodeURIComponent((task as any).orgId || "")}&taskId=${encodeURIComponent(taskId)}`,
      { credentials: "include" },
    )
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const files = Array.isArray(d?.data) ? d.data : [];
        setTaskAttachments(
          files.map((f: any) => ({
            id: f.id,
            originalName: f.originalName || f.name || "",
            size: f.size || 0,
            mimeType: f.mimeType || "application/octet-stream",
            createdAt: f.createdAt || "",
          })),
        );
      })
      .catch(() => {
        if (active) setTaskAttachments([]);
      })
      .finally(() => {
        if (active) setAttachmentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [task._id, (task as any).orgId]);

  const openPreview = (att: {
    id: string;
    originalName: string;
    size: number;
    mimeType: string;
    createdAt: string;
  }) => {
    setPreviewFile(att);
    setPreviewOpen(true);
  };

  const taskType = task.type || "individual";
  const typeOptions = STATUS_OPTIONS_BY_TYPE[taskType] || STATUS_OPTIONS_BY_TYPE.individual;

  const progressMap: Record<string, number> = {
    assigned: 10,
    pending: 20,
    in_progress: 40,
    submitted: 60,
    approved: 80,
    completed: 100,
    closed: 100,
    published: 50,
    accepted: 80,
    scheduled: 20,
    activated: 40,
    hold: 20,
    cancelled: 100,
    rejected: 100,
    reopened: 20,
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

      const resData = await res.json();
      const finalTask = resData.data
        ? { ...task, ...resData.data }
        : { ...task, status: newStatus };
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
      onTaskUpdate?.({
        ...task,
        status:
          action === "approve"
            ? "approved"
            : action === "reject"
              ? "rejected"
              : action === "submit-verification"
                ? "submitted"
                : action === "publish"
                  ? "published"
                  : action === "activate"
                    ? "activated"
                    : task.status,
      });
      setTask((prev) => ({
        ...prev,
        status:
          action === "approve"
            ? "approved"
            : action === "reject"
              ? "rejected"
              : action === "submit-verification"
                ? "submitted"
                : action === "publish"
                  ? "published"
                  : action === "activate"
                    ? "activated"
                    : prev.status,
      }));
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const activeStatusOpt = typeOptions.find((o) => o.value === task.status);
  const StatusIcon = activeStatusOpt?.icon || CircleDashedIcon;
  const PriorityIcon = priorityIcons[task.priority] || CircleIcon;
  const typeBadge = TYPE_BADGES[taskType] || TYPE_BADGES.individual;

  const findEmployeeByFullName = (name?: string) => {
    if (!name) return undefined;
    const normalized = name.trim().toLowerCase();
    return employees.find((e) => {
      const fullName = `${e.firstName} ${e.lastName || ""}`.trim().toLowerCase();
      return fullName === normalized || e.firstName.toLowerCase() === normalized;
    });
  };
  const creatorEmployee = findEmployeeByFullName(task.creatorName);
  const teamHeadEmployee = findEmployeeByFullName(task.teamHeadName);

  return (
    <div className="flex flex-col sm:flex-row w-full h-full overflow-hidden bg-background">
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md flex items-center gap-1 border border-primary/15">
              <FolderIcon className="size-3.5 shrink-0" />
              {task.project || "General Workspace"}
            </span>
            <Badge variant="secondary" className="text-xs px-2.5 py-1 font-medium rounded-md">
              {typeBadge.label}
            </Badge>
            <Badge
              className={`${priorityStyles[task.priority.toLowerCase()] || "bg-muted text-muted-foreground"} text-xs px-2.5 py-1 font-semibold rounded-md flex items-center gap-1 border`}
            >
              <PriorityIcon className="size-3 shrink-0" />
              <span className="capitalize">{task.priority} Priority</span>
            </Badge>
            {task.dueDate &&
              (() => {
                const now = new Date();
                const due = new Date(task.dueDate!);
                const diffMs = due.getTime() - now.getTime();
                const COMPLETED = new Set(["completed", "done", "cancelled", "closed"]);
                const isOverdue = diffMs < 0 && !COMPLETED.has(task.status);
                const isDueSoon = diffMs > 0 && diffMs <= 86400000 && !COMPLETED.has(task.status);
                return (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-1">
                    <CalendarIcon className="size-3.5" />
                    Due{" "}
                    {new Date(task.dueDate!).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                    {isOverdue && (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-2 py-0 gap-1 rounded-md">
                        <AlertCircleIcon className="size-2.5" /> Overdue
                      </Badge>
                    )}
                    {isDueSoon && (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-2 py-0 gap-1 rounded-md">
                        <ClockIcon className="size-2.5" /> Due Soon
                      </Badge>
                    )}
                  </span>
                );
              })()}
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-5">{task.title}</h1>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 bg-muted/40 p-4 rounded-xl border border-border">
            <div className="flex flex-col gap-1.5 shrink-0">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Status
              </label>
              <Select value={task.status} onValueChange={handleStatusChange} disabled={updating}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-lg bg-card font-semibold text-sm shadow-sm">
                  {updating ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2Icon className="size-4 animate-spin" /> Updating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`size-4 ${activeStatusOpt?.color}`} />
                      <span className="text-foreground">{activeStatusOpt?.label}</span>
                    </div>
                  )}
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {typeOptions.map((opt) => {
                    const OptIcon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value} className="rounded-md my-0.5">
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
              <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <span>Progress</span>
                <span className="text-foreground font-bold">{progress}%</span>
              </div>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                    task.status === "completed" ||
                    task.status === "approved" ||
                    task.status === "closed"
                      ? "from-emerald-400 to-green-500"
                      : task.status === "rejected" || task.status === "cancelled"
                        ? "from-orange-400 to-red-500"
                        : "from-primary to-indigo-600"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:ml-4">
              {taskType === "team" && task.status === "in_progress" && (
                <Button
                  size="sm"
                  variant="default"
                  className="px-4 rounded-lg text-xs font-semibold shadow-sm"
                  onClick={() => handleAction("submit-verification")}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <AlertCircleIcon className="size-3.5 mr-1.5" />
                  )}
                  Submit for Verification
                </Button>
              )}
              {taskType === "team" && task.status === "submitted" && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="px-4 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                    onClick={() => {
                      const note = prompt("Approval note (optional):");
                      handleAction("approve", { note });
                    }}
                    disabled={actionLoading}
                  >
                    <CheckCircleIcon className="size-3.5 mr-1.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="px-4 rounded-lg text-xs font-semibold shadow-sm"
                    onClick={() => {
                      const reason = prompt("Rejection reason (required):");
                      if (reason) handleAction("reject", { reason });
                    }}
                    disabled={actionLoading}
                  >
                    <XCircleIcon className="size-3.5 mr-1.5" />
                    Reject
                  </Button>
                </div>
              )}
              {taskType === "upcoming" && task.status === "scheduled" && (
                <Button
                  size="sm"
                  variant="default"
                  className="px-4 rounded-lg text-xs font-semibold shadow-sm"
                  onClick={() => handleAction("activate")}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <ClockIcon className="size-3.5 mr-1.5" />
                  )}
                  Activate Now
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-6 py-6 space-y-7">
          <Section icon={AlignLeftIcon} title="Description">
            <div className="rounded-lg border border-border bg-card shadow-sm p-4 sm:p-5">
              {task.description ? (
                <div
                  className="text-sm leading-relaxed text-foreground"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground opacity-60">
                  <AlignLeftIcon className="size-6 mb-2" />
                  <p className="text-sm italic">No description provided for this task.</p>
                </div>
              )}
            </div>
          </Section>

          <Section icon={FileTextIcon} title="Details">
            <div className="rounded-lg border border-border bg-card shadow-sm p-5">
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                <DetailItem
                  icon={HashIcon}
                  label="Task ID"
                  value={<code className="text-xs text-muted-foreground">{task._id}</code>}
                />
                <DetailItem icon={UserIcon} label="Created By" value={task.creatorName} />
                <DetailItem
                  icon={UserCheckIcon}
                  label="Assigned To"
                  value={taskType === "team" ? task.teamName || "Team" : task.assigneeName}
                />
                {taskType === "team" && task.teamName && (
                  <DetailItem icon={UsersIcon} label="Team" value={task.teamName} />
                )}
                <DetailItem
                  icon={CalendarIcon}
                  label="Start Date"
                  value={formatDate(task.startDate)}
                />
                <DetailItem icon={CalendarIcon} label="Due Date" value={formatDate(task.dueDate)} />
                {task.scheduledDate && (
                  <DetailItem
                    icon={CalendarIcon}
                    label="Scheduled"
                    value={formatDate(task.scheduledDate)}
                  />
                )}
                {task.activatedAt && (
                  <DetailItem
                    icon={ActivityIcon}
                    label="Activated"
                    value={formatDate(task.activatedAt)}
                  />
                )}
                {task.submittedAt && (
                  <DetailItem
                    icon={ClockIcon}
                    label="Submitted"
                    value={formatDate(task.submittedAt, true)}
                  />
                )}
                <DetailItem
                  icon={ClockIcon}
                  label="Created"
                  value={formatDate(task.createdAt, true)}
                />
                <DetailItem
                  icon={ClockIcon}
                  label="Last Updated"
                  value={formatDate(task.updatedAt, true)}
                />
                {task.assignmentMode && (
                  <DetailItem
                    icon={UserIcon}
                    label="Assignment Mode"
                    value={
                      <span className="capitalize">{task.assignmentMode.replace(/_/g, " ")}</span>
                    }
                  />
                )}
                {task.assigneeIds && task.assigneeIds.length > 0 && (
                  <DetailItem
                    icon={UsersIcon}
                    label="Members"
                    value={`${task.assigneeIds.length}`}
                  />
                )}
                {task.project && (
                  <DetailItem icon={FolderIcon} label="Project" value={task.project} />
                )}
              </dl>
            </div>
          </Section>

          <Section icon={UserIcon} title="People">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
              <PersonBadge
                name={task.assigneeName}
                avatar={task.assigneeAvatar}
                role="Assigned To"
              />
              <PersonBadge
                name={task.creatorName}
                avatar={creatorEmployee?.avatar || ""}
                role="Created By"
              />
              {task.teamHeadName && (
                <PersonBadge
                  name={task.teamHeadName}
                  avatar={teamHeadEmployee?.avatar || ""}
                  role="Team Head"
                />
              )}
            </div>

            {task.memberStatuses && task.memberStatuses.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Team Assignment Progress
                </h4>
                <div className="space-y-3">
                  {task.memberStatuses.map((member) => {
                    const emp = employees.find((e) => e.id === member.userId);
                    const name = emp ? `${emp.firstName} ${emp.lastName}` : member.userId;
                    const avatar = emp?.avatar || "";
                    const designation = emp?.role || "Staff";
                    const isSelf = member.userId === currentUserId;

                    return (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage src={avatar} />
                            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground">{designation}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelf ? (
                            <Select
                              disabled={updating}
                              value={member.status}
                              onValueChange={(val) => handleStatusChange(val)}
                            >
                              <SelectTrigger className="h-8 w-[130px] text-xs">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="assigned">Assigned</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="hold">Hold</SelectItem>
                                <SelectItem value="under_review">Under Review</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              className="capitalize text-xs px-2.5 py-0.5"
                              variant={
                                member.status === "completed" ? ("success" as any) : "secondary"
                              }
                            >
                              {member.status.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>

          <Section icon={PaperclipIcon} title="Attachments">
            <div className="rounded-lg border border-border bg-card shadow-sm p-4 sm:p-5">
              {attachmentsLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  <p className="text-sm">Loading attachments…</p>
                </div>
              ) : taskAttachments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground opacity-60">
                  <PaperclipIcon className="size-6 mb-2" />
                  <p className="text-sm italic">No attachments for this task.</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {taskAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/40 hover:shadow-sm transition-all group cursor-pointer"
                    >
                      <button
                        type="button"
                        onClick={() => openPreview(att)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        title="Open file online"
                      >
                        <FileTextIcon className="size-5 text-primary shrink-0" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground truncate">
                            {att.originalName}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatBytes(att.size)}
                          </span>
                        </div>
                      </button>
                      <a
                        href={`/api/files/${att.id}?download=true`}
                        download={att.originalName}
                        title="Download"
                        className="shrink-0 text-muted-foreground hover:text-primary transition-colors p-1.5"
                      >
                        <DownloadIcon className="size-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {(task.status === "approved" || (task.status === "completed" && task.approvedBy)) && (
            <Section icon={CheckCircleIcon} title="Approval Details">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-3 text-emerald-700 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <UserCheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-sm">Task Approved</span>
                  </div>
                  <span className="text-[10px] font-medium opacity-80 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-md sm:ml-auto">
                    {task.approvedAt
                      ? new Date(task.approvedAt).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : ""}
                  </span>
                </div>
                {task.approvalNote && (
                  <div className="bg-card rounded-lg p-3 text-sm text-foreground border border-border">
                    <span className="font-bold block text-[9px] uppercase tracking-widest text-emerald-600 opacity-70 mb-1">
                      Note
                    </span>
                    {task.approvalNote}
                  </div>
                )}
                {task.approverName && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-3 font-medium">
                    Approved by{" "}
                    <strong className="text-emerald-900 dark:text-emerald-200">
                      {task.approverName}
                    </strong>
                  </p>
                )}
              </div>
            </Section>
          )}

          {task.status === "rejected" && task.rejectionReason && (
            <Section icon={XCircleIcon} title="Rejection Details">
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-3 text-rose-700 dark:text-rose-300">
                  <div className="flex items-center gap-2">
                    <XCircleIcon className="size-4 text-rose-600 dark:text-rose-400" />
                    <span className="font-semibold text-sm">Task Rejected</span>
                  </div>
                  <span className="text-[10px] font-medium opacity-80 bg-rose-500/15 text-rose-700 dark:text-rose-300 px-2.5 py-0.5 rounded-md sm:ml-auto">
                    {task.rejectedAt
                      ? new Date(task.rejectedAt).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : ""}
                  </span>
                </div>
                {task.rejectionReason && (
                  <div className="bg-card rounded-lg p-3 text-sm text-foreground border border-border">
                    <span className="font-bold block text-[9px] uppercase tracking-widest text-rose-600 opacity-70 mb-1">
                      Reason
                    </span>
                    {task.rejectionReason}
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section icon={ActivityIcon} title="Activity Timeline">
            <div className="rounded-lg border border-border bg-card shadow-sm p-5">
              <div className="relative border-l-2 border-border ml-2.5 space-y-5 pb-1">
                <div className="relative pl-6">
                  <span className="absolute -left-[7px] top-1 size-3 rounded-full bg-primary ring-4 ring-background shadow-sm" />
                  <p className="text-sm font-semibold text-foreground">Task Created</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(task.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="relative pl-6">
                  <span className="absolute -left-[7px] top-1 size-3 rounded-full bg-muted-foreground ring-4 ring-background shadow-sm" />
                  <p className="text-sm font-semibold text-foreground">
                    Assigned to {task.assigneeName || "Someone"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">By {task.creatorName}</p>
                </div>
                {task.updatedAt && (
                  <div className="relative pl-6">
                    <span className="absolute -left-[7px] top-1 size-3 rounded-full bg-amber-500 ring-4 ring-background shadow-sm" />
                    <p className="text-sm font-semibold text-foreground">Last Activity</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(task.updatedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Right Column - Comments / Chat */}
      <div className="w-full sm:w-[360px] shrink-0 flex flex-col border-t sm:border-t-0 sm:border-l border-border h-full bg-card">
        <TaskChat
          taskId={task._id}
          sessionUserId={sessionUserId || ""}
          orgId={(task as any).orgId}
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

      {/* Inline file preview - opens within this view, no new tab */}
      <FilePreviewDialog
        file={previewFile}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        orgId={(task as any).orgId}
      />
    </div>
  );
}
