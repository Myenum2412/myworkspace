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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Users, CircleDollarSign, Briefcase, User } from "lucide-react";

type Department = {
  name: string;
  head: string;
  headAvatar: string;
  memberCount: number;
  openPositions: number;
  budget: string;
  color: string;
};

type DepartmentViewDialogProps = {
  department: Department | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

function Field({ icon: Icon, label, value }: { icon?: React.FC<{ className?: string }>; label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start gap-3 rounded-sm border bg-card px-4 py-3">
      {Icon && <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value ?? "\u2014"}</p>
      </div>
    </div>
  );
}

export function DepartmentViewDialog({ department, open, onOpenChange }: DepartmentViewDialogProps) {
  if (!department) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-sm ${department.color} text-black`}>
              <Building2 className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">{department.name}</DialogTitle>
              <DialogDescription>Department details</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field icon={Building2} label="Department Name" value={department.name} />
            <Field icon={Users} label="Member Count" value={department.memberCount} />
            <Field icon={Briefcase} label="Open Positions" value={department.openPositions} />
            <Field icon={CircleDollarSign} label="Budget" value={department.budget} />
          </div>
          <div className="flex items-center gap-3 rounded-sm border bg-card px-4 py-3">
            <Avatar className="size-8">
              <AvatarImage src={department.headAvatar} alt={department.head} />
              <AvatarFallback className="text-xs">{getInitials(department.head)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Department Head</p>
              <p className="text-sm font-medium">{department.head}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
