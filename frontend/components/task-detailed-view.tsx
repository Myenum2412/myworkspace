"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
  PencilIcon, AlignLeftIcon, UserIcon, CalendarIcon, HashIcon, 
  ListTodoIcon, CheckCircleIcon, XCircleIcon, PaperclipIcon, 
  ActivityIcon, FolderIcon, AlertCircleIcon, ClockIcon, Loader2Icon,
  CircleIcon, CircleDashedIcon, FileTextIcon, UserCheckIcon
} from "lucide-react";
import { TaskChat } from "@/components/task-chat";
import { toast } from "sonner";

export type Task = {
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
  updatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNote?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
};

const statusOptions = [
  { value: "todo", label: "To Do", icon: CircleDashedIcon, color: "text-gray-500" },
  { value: "in_progress", label: "In Progress", icon: ClockIcon, color: "text-blue-500" },
  { value: "review", label: "Review", icon: AlertCircleIcon, color: "text-purple-500" },
  { value: "done", label: "Done", icon: CheckCircleIcon, color: "text-green-500" },
  { value: "postponed", label: "Postponed", icon: ClockIcon, color: "text-orange-500" },
  { value: "cancelled", label: "Cancelled", icon: XCircleIcon, color: "text-red-500" },
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

function PersonBadge({ name, avatar, role }: { name: string; avatar: string; role: string }) {
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

export function TaskDetailedView({
  task: initialTask,
  onEdit,
  sessionUserId,
  onTaskUpdate,
  onClose,
}: {
  task: Task;
  onEdit?: (t: Task) => void;
  sessionUserId?: string;
  onTaskUpdate?: (t: Task) => void;
  onClose?: () => void;
}) {
  const [task, setTask] = useState<Task>(initialTask);
  const [updating, setUpdating] = useState(false);

  // Derive progress from status
  const progressMap: Record<string, number> = {
    todo: 0,
    in_progress: 35,
    review: 75,
    done: 100,
    postponed: 100,
    cancelled: 100,
  };
  const progress = progressMap[task.status] ?? 0;

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update status");
      }
      
      const responseData = await res.json();
      const finalTask = responseData.data ? { ...task, ...responseData.data } : { ...task, status: newStatus };
      setTask(finalTask);
      onTaskUpdate?.(finalTask);
      toast.success("Task status updated");
    } catch (err: any) {
      toast.error(err.message || "Could not update status. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const activeStatusOpt = statusOptions.find(o => o.value === task.status);
  const StatusIcon = activeStatusOpt?.icon || CircleDashedIcon;
  const PriorityIcon = priorityIcons[task.priority] || CircleIcon;

  return (
    <div className="flex flex-1 min-h-0 h-full max-h-[85vh] bg-background rounded-xl overflow-hidden shadow-2xl border">
      {/* Left Column - Details */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto border-r bg-[#fafafa]/50">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 bg-white border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full w-fit">
              <FolderIcon className="size-4" />
              <span>Project / General Workspace</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`px-3 py-1 text-xs capitalize ${priorityStyles[task.priority]}`}>
                <PriorityIcon className="size-3.5 mr-1.5" />
                {task.priority} Priority
              </Badge>
              {task.dueDate && (
                <Badge variant="outline" className="px-3 py-1 text-xs bg-white text-muted-foreground">
                  <CalendarIcon className="size-3.5 mr-1.5" />
                  Due {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Badge>
              )}
            </div>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6">
            {task.title}
          </h1>

          <div className="flex items-center gap-6">
            {/* Interactive Status updater */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Current Status</label>
              <Select value={task.status} onValueChange={handleStatusChange} disabled={updating}>
                <SelectTrigger className="w-[180px] h-10 bg-white border-gray-200 shadow-sm font-medium">
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
                  {statusOptions.filter(o => o.value !== "cancelled" || task.status === "cancelled").map((opt) => {
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

            {/* Progress Bar Display */}
            <div className="flex flex-col gap-1.5 flex-1 max-w-xs ml-auto">
              <div className="flex justify-between items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Progress</span>
                <span className={task.status === "done" ? "text-green-600" : ""}>{progress}%</span>
              </div>
              <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    task.status === "done" ? "bg-green-500" : 
                    task.status === "postponed" ? "bg-orange-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 px-8 py-8 space-y-10">
          
          <Section icon={AlignLeftIcon} title="Description">
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              {task.description ? (
                <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">{task.description}</p>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground opacity-60">
                  <AlignLeftIcon className="size-8 mb-2" />
                  <p className="text-sm italic">No description provided for this task.</p>
                </div>
              )}
            </div>
          </Section>

          <div className="grid grid-cols-2 gap-6">
            <Section icon={UserIcon} title="People">
              <div className="space-y-3">
                <PersonBadge name={task.assigneeName} avatar={task.assigneeAvatar} role="Assigned To" />
                <PersonBadge name={task.creatorName} avatar="" role="Created By" />
              </div>
            </Section>
            
            <Section icon={PaperclipIcon} title="Attachments">
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-6 flex flex-col items-center justify-center text-center h-full min-h-[140px]">
                <FileTextIcon className="size-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-600">No attachments yet</p>
                <p className="text-xs text-gray-500 mt-1">Attachments are not available in this view.</p>
              </div>
            </Section>
          </div>

          {(task.status === "done" && task.approvedAt) && (
            <Section icon={CheckCircleIcon} title="Approval Details">
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3 text-green-800">
                  <UserCheckIcon className="size-5" />
                  <span className="font-semibold text-sm">Task Approved</span>
                  <span className="text-xs ml-auto opacity-70 bg-green-200/50 px-2 py-1 rounded-md">
                    {new Date(task.approvedAt).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
                {task.approvalNote && (
                  <div className="bg-white/60 rounded-lg p-3 text-sm text-green-900 border border-green-100/50">
                    <span className="font-semibold block text-[11px] uppercase tracking-wider opacity-60 mb-1">Note</span>
                    {task.approvalNote}
                  </div>
                )}
              </div>
            </Section>
          )}

          {(task.status === "postponed" && task.rejectedAt) && (
            <Section icon={XCircleIcon} title="Postponed Details">
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3 text-orange-800">
                  <XCircleIcon className="size-5" />
                  <span className="font-semibold text-sm">Task Postponed</span>
                  <span className="text-xs ml-auto opacity-70 bg-orange-200/50 px-2 py-1 rounded-md">
                    {new Date(task.rejectedAt).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
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
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="relative border-l border-gray-200 ml-3 space-y-6 pb-2">
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

        {/* Read-Only Banner & Optional Admin Edit Button */}
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-100 px-3 py-1.5 rounded-full">
            <AlertCircleIcon className="size-4" />
            <span>Task details are <b>read-only</b>. Use the status dropdown to update progress.</span>
          </div>
          
          {onEdit && (
            <Button variant="outline" onClick={() => onEdit(task)} className="bg-white hover:bg-gray-50">
              <PencilIcon className="size-3.5 mr-2" />
              Edit as Admin
            </Button>
          )}
        </div>
      </div>

      {/* Right Column - Comments / Chat */}
      <div className="w-[380px] shrink-0 flex flex-col bg-white border-l z-10">
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
        />
      </div>
    </div>
  );
}
