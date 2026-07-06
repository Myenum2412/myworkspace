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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Clock, Calendar, LogIn, LogOut } from "lucide-react";

type AttendanceRecord = {
  name: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
};

type AttendanceViewDialogProps = {
  record: AttendanceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const statusStyles: Record<string, string> = {
  present: "bg-red-100 text-red-700 border-red-300",
  absent: "bg-gray-100 text-gray-700 border-gray-300",
  late: "bg-orange-100 text-orange-700 border-orange-300",
};

function Field({ icon: Icon, label, value }: { icon?: React.FC<{ className?: string }>; label: string; value?: string | null }) {
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

export function AttendanceViewDialog({ record, open, onOpenChange }: AttendanceViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <div className="flex items-center gap-4">
            <Avatar className="size-12 ring-2 ring-border">
              <AvatarFallback className="text-base">{getInitials(record.name)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-lg">{record.name}</DialogTitle>
              <Badge className={statusStyles[record.status] || ""}>{record.status}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <Field icon={LogIn} label="Check In" value={record.checkIn} />
            <Field icon={LogOut} label="Check Out" value={record.checkOut} />
            <Field icon={Clock} label="Status" value={record.status} />
            <Field icon={Calendar} label="Date" value={new Date().toLocaleDateString()} />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
