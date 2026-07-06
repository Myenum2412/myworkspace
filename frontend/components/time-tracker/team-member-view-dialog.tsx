"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Clock, CalendarDays, Building2, Briefcase, Activity } from "lucide-react";

interface TeamMemberSummary {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  status: string;
  department: string;
  designation: string;
  role: string;
  totalMinutes: number;
  totalHours: string;
  entryCount: number;
  pendingEntries: number;
  approvedEntries: number;
}

type TeamMemberViewDialogProps = {
  member: TeamMemberSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

function Field({ icon: Icon, label, value }: { icon?: React.FC<{ className?: string }>; label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
      {Icon && <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value ?? "\u2014"}</p>
      </div>
    </div>
  );
}

export function TeamMemberViewDialog({ member, open, onOpenChange }: TeamMemberViewDialogProps) {
  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <div className="flex items-center gap-4">
            <Avatar className="size-12 ring-2 ring-border">
              <AvatarImage src={member.avatar} alt={member.name} />
              <AvatarFallback className="text-base">{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-lg">{member.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 px-6 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field icon={Building2} label="Department" value={member.department} />
            <Field icon={Briefcase} label="Designation" value={member.designation} />
            <Field icon={Users} label="Role" value={member.role} />
            <Field icon={Activity} label="Status" value={member.status} />
            <Field icon={Clock} label="Total Hours" value={`${member.totalHours}h`} />
            <Field icon={CalendarDays} label="Entries" value={member.entryCount} />
            <Field icon={Badge} label="Approved" value={member.approvedEntries} />
            <Field icon={Badge} label="Pending" value={member.pendingEntries} />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
