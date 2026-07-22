"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, FileText, Tag, User, CheckCircle2, XCircle } from "lucide-react";

interface TimeEntry {
  id: string;
  userId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  description: string;
  projectId?: string;
  projectName?: string;
  billable: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

type TimeEntryViewDialogProps = {
  entry: TimeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Field({ icon: Icon, label, value }: { icon?: React.FC<{ className?: string }>; label: string; value?: string | number | null | boolean }) {
  const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : (value ?? "\u2014");
  return (
    <div className="flex items-start gap-3 rounded-sm border bg-card px-4 py-3">
      {Icon && <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium mt-0.5 break-words">{displayValue}</p>
      </div>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export function TimeEntryViewDialog({ entry, open, onOpenChange }: TimeEntryViewDialogProps) {
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full p-0 flex flex-col sm:max-h-[90vh]">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 shrink-0 border-b">
          <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
            <Clock className="size-4 sm:size-5 text-muted-foreground" />
            Time Entry Details
          </DialogTitle>
          <DialogDescription>
            <Badge className={statusStyles[entry.status] || ""}>
              {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 px-4 sm:px-6 py-4 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field icon={FileText} label="Description" value={entry.description} />
            <Field icon={Tag} label="Project" value={entry.projectName} />
            <Field icon={Calendar} label="Date" value={new Date(entry.date).toLocaleDateString()} />
            <Field icon={Clock} label="Time Range" value={entry.startTime && entry.endTime ? `${entry.startTime} - ${entry.endTime}` : null} />
            <Field icon={Clock} label="Duration" value={`${Math.floor(entry.duration / 60)}h ${entry.duration % 60}m`} />
            <Field icon={User} label="User ID" value={entry.userId} />
            <Field icon={Tag} label="Billable" value={entry.billable} />
            <Field icon={entry.status === "approved" ? CheckCircle2 : entry.status === "rejected" ? XCircle : Clock} label="Status" value={entry.status} />
          </div>
          {entry.createdAt && (
            <p className="text-[11px] text-muted-foreground pt-2 border-t">
              Created: {new Date(entry.createdAt).toLocaleString()}
            </p>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t px-4 sm:px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto touch-target">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
