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
  SaveIcon, FileEditIcon, GlobeIcon, UsersIcon,
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
  common: [
    { value: "draft", label: "Draft", icon: FileEditIcon, color: "text-gray-500" },
    { value: "published", label: "Published", icon: GlobeIcon, color: "text-green-500" },
    { value: "accepted", label: "Accepted", icon: CheckCircleIcon, color: "text-blue-500" },
    { value: "completed", label: "Completed", icon: CheckCircleIcon, color: "text-green-500" },
  ],
  upcoming: [
    { value: "draft", label: "Draft", icon: FileEditIcon, color: "text-gray-500" },
    { value: "scheduled", label: "Scheduled", icon: ClockIcon, color: "text-blue-500" },
    { value: "activated", label: "Activated", icon: UserCheckIcon, color: "text-green-500" },
    { value: "in_progress", label: "In Progress", icon: ClockIcon, color: "text-blue-500" },
    { value: "completed", label: "Completed", icon: CheckCircleIcon, color: "text-green-500" },
    { value: "cancelled", label: "Cancelled", icon: XCircleIcon, color: "text-red-500" },
  ],
  draft: [
    { value: "draft", label: "Draft", icon: FileEditIcon, color: "text-gray-500" },
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Icon className="size-4" />
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
    <div className="flex items-center gap-3 rounded-xl border bg-card/50 px-4 py-3 transition-colors hover:bg-accent/50">
      <div className="size-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-background shadow-sm">
        {avatar ? (
          <img src={avatar} alt={name} className="size-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-muted-foreground">
            {(name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{role}</span>
        <span className="text-sm font-semibold text-foreground">{name || "Unassigned"}</span>
      </div>
    </div>
  );
}

const TYPE_BADGES: Record<string, { label: string; icon: any; color: string }> = {
  individual: { label: "Individual", icon: UserIcon, color: "bg-blue-50 text-blue-700 border-blue-200" },
  team: { label: "Team", icon: UsersIcon, color: "bg-purple-50 text-purple-700 border-purple-200" },
  common: { label: "Common", icon: GlobeIcon, color: "bg-green-50 text-green-700 border-green-200" },
  upcoming: { label: "Upcoming", icon: ClockIcon, color: "bg-orange-50 text-orange-700 border-orange-200" },
  draft: { label: "Draft", icon: FileEditIcon, color: "bg-gray-50 text-gray-700 border-gray-200" },
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
    <div className="flex flex-col sm:flex-row flex-1 min-h-0 h-full max-h-[85vh] bg-background rounded-xl overflow-hidden shadow-2xl border">
      {/* Left Column - Details */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto border-r sm:border-r bg-[#fafafa]/50">

        {/* Header */}
        <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-6 bg-white border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-[11px] sm:text-sm font-medium text-muted-foreground bg-muted/50 px-2 sm:px-3 py-1 rounded-full w-fit">
                <FolderIcon className="size-3 sm:size-4" sx={{ fontSize: "inherit" }} />
                <span>Project / {task.project || "General Workspace"}</span>
              </div>
              <Badge variant="outline" className={`px-2 py-0.5 text-[10px] sm:text-xs capitalize ${typeBadge.color}`}>
                <typeBadge.icon className="size-3 mr-1" />
                {typeBadge.label}
              </Badge>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Badge variant="outline" className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs capitalize ${priorityStyles[task.priority]}`}>
                <PriorityIcon className="size-3 sm:size-3.5 mr-1 sm:mr-1.5" />
                {task.priority} Priority
              </Badge>
              {task.dueDate && (
                <Badge variant="outline" className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-white text-muted-foreground">
                  <CalendarIcon className="size-3 sm:size-3.5 mr-1 sm:mr-1.5" />
                  Due {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Badge>
              )}
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-4 sm:mb-6">
            {task.title}
          </h1>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Current Status</label>
                  <Select value={task.status} onValueChange={handleStatusChange} disabled={updating}>
                    <SelectTrigger className="w-full sm:w-[180px] h-10 bg-white border-gray-200 shadow-sm font-medium">
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
                          <SelectItem key={opt.value} value={opt.value} className="font-medium">
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
                  <div className="flex justify-between items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Progress</span>
                    <span className={task.status === "done" ? "text-green-600" : ""}>{progress}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        task.status === "completed" || task.status === "approved" || task.status === "closed" ? "bg-green-500" :
                        task.status === "rejected" || task.status === "cancelled" ? "bg-orange-500" : "bg-blue-600"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Type-specific action buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {taskType === "team" && task.status === "in_progress" && (
                    <Button size="sm" variant="default" className="h-8 text-xs rounded-lg" onClick={() => handleAction("submit-verification")} disabled={actionLoading}>
                      {actionLoading ? <Loader2Icon className="size-3 animate-spin mr-1" /> : <AlertCircleIcon className="size-3 mr-1" />}
                      Submit for Verification
                    </Button>
                  )}
                  {taskType === "team" && task.status === "submitted" && (
                    <>
                      <Button size="sm" variant="default" className="h-8 text-xs rounded-lg bg-green-600 hover:bg-green-700" onClick={() => {
                        const note = prompt("Approval note (optional):");
                        handleAction("approve", { note });
                      }} disabled={actionLoading}>
                        <CheckCircleIcon className="size-3 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="h-8 text-xs rounded-lg" onClick={() => {
                        const reason = prompt("Rejection reason (required):");
                        if (reason) handleAction("reject", { reason });
                      }} disabled={actionLoading}>
                        <XCircleIcon className="size-3 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {taskType === "common" && task.status === "draft" && (
                    <Button size="sm" variant="default" className="h-8 text-xs rounded-lg" onClick={() => handleAction("publish")} disabled={actionLoading}>
                      {actionLoading ? <Loader2Icon className="size-3 animate-spin mr-1" /> : <GlobeIcon className="size-3 mr-1" />}
                      Publish
                    </Button>
                  )}
                  {taskType === "upcoming" && task.status === "scheduled" && (
                    <Button size="sm" variant="default" className="h-8 text-xs rounded-lg" onClick={() => handleAction("activate")} disabled={actionLoading}>
                      {actionLoading ? <Loader2Icon className="size-3 animate-spin mr-1" /> : <ClockIcon className="size-3 mr-1" />}
                      Activate Now
                    </Button>
                  )}
                </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 px-4 sm:px-8 py-4 sm:py-8 space-y-6 sm:space-y-10">

          <Section icon={AlignLeftIcon} title="Description">
            <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
              {task.description ? (
                <p className="text-sm sm:text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">{task.description}</p>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 sm:py-6 text-muted-foreground opacity-60">
                  <AlignLeftIcon className="size-6 sm:size-8 mb-2" />
                  <p className="text-sm italic">No description provided for this task.</p>
                </div>
              )}
            </div>
          </Section>

          <Section icon={UserIcon} title="People">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
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

          <Section icon={PaperclipIcon} title="Attachments">
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4 sm:p-6 flex flex-col items-center justify-center text-center h-full min-h-[100px] sm:min-h-[140px]">
              <FileTextIcon className="size-6 sm:size-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">No attachments yet</p>
              <p className="text-xs text-gray-500 mt-1">Attachments are not available in this view.</p>
            </div>
          </Section>

          {(task.status === "approved" || (task.status === "completed" && task.approvedBy)) && (
            <Section icon={CheckCircleIcon} title="Approval Details">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-3 text-green-800">
                  <div className="flex items-center gap-2">
                    <UserCheckIcon className="size-4 sm:size-5" />
                    <span className="font-semibold text-sm">Task Approved</span>
                  </div>
                  <span className="text-[11px] sm:text-xs opacity-70 bg-green-200/50 px-2 py-1 rounded-md sm:ml-auto">
                    {task.approvedAt ? new Date(task.approvedAt).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "long", day: "numeric" }) : ""}
                  </span>
                </div>
                {task.approvalNote && (
                  <div className="bg-white/60 rounded-lg p-3 text-sm text-green-900 border border-green-100/50">
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
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-3 text-orange-800">
                  <div className="flex items-center gap-2">
                    <XCircleIcon className="size-4 sm:size-5" />
                    <span className="font-semibold text-sm">Task Rejected</span>
                  </div>
                  <span className="text-[11px] sm:text-xs ml-0 sm:ml-auto opacity-70 bg-orange-200/50 px-2 py-1 rounded-md">
                    {task.rejectedAt ? new Date(task.rejectedAt).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "long", day: "numeric" }) : ""}
                  </span>
                </div>
                {task.rejectionReason && (
                  <div className="bg-white/60 rounded-lg p-3 text-sm text-red-900 border border-red-100/50">
                    <span className="font-semibold block text-[11px] uppercase tracking-wider opacity-60 mb-1">Reason</span>
                    {task.rejectionReason}
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section icon={ActivityIcon} title="Activity Timeline">
            <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
              <div className="relative border-l border-gray-200 ml-3 space-y-4 sm:space-y-6 pb-2">
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

        {/* Bottom Banner */}
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
            <AlertCircleIcon className="size-3 sm:size-4" />
            <span>Use the status dropdown to update progress.</span>
          </div>
        </div>
      </div>

      {/* Right Column - Comments / Chat */}
      <div className="w-full sm:w-[380px] shrink-0 flex flex-col bg-white sm:border-l border-t sm:border-t-0 z-10 max-h-[300px] sm:max-h-none">
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
