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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserX, Calendar, User, Mail, Briefcase, Building2, FileText, Tag } from "lucide-react";
import type { TerminatedEmployee } from "@/app/employees/columns";

type TerminatedViewDialogProps = {
  employee: TerminatedEmployee | null;
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
        <p className="text-sm font-medium mt-0.5 break-words">{value ?? "\u2014"}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}

export function TerminatedViewDialog({ employee, open, onOpenChange }: TerminatedViewDialogProps) {
  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <div className="flex items-start gap-4">
            <Avatar className="size-14 ring-2 ring-border">
              <AvatarImage src={employee.avatar} alt={employee.name} />
              <AvatarFallback className="text-lg">{getInitials(employee.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl">{employee.name}</DialogTitle>
              <DialogDescription className="mt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">{employee.email}</span>
                  <Badge variant="outline" className="capitalize">{employee.role}</Badge>
                </div>
              </DialogDescription>
            </div>
            <Badge className="bg-red-50 text-red-700 border-red-200 shrink-0">Terminated</Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 px-6 py-4 overflow-y-auto">
          <div className="space-y-6 pb-4">

            <Section title="Termination Details">
              <Field icon={Calendar} label="Termination Date" value={employee.terminateDate ? new Date(employee.terminateDate).toLocaleDateString() : null} />
              <div className="sm:col-span-2">
                <Field icon={FileText} label="Reason" value={employee.terminateReason} />
              </div>
            </Section>

            <Separator />

            <Section title="Work Information">
              <Field icon={Building2} label="Department" value={employee.department} />
              <Field icon={Briefcase} label="Designation" value={employee.designation} />
              <Field icon={Tag} label="Employment Type" value={employee.employmentType} />
              <Field icon={User} label="Role" value={employee.role} />
              <Field icon={Building2} label="Branch" value={employee.branchName} />
              <Field icon={Calendar} label="Joining Date" value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : null} />
              <Field icon={Tag} label="Location" value={employee.location} />
              <Field icon={Tag} label="Shift" value={employee.shift} />
            </Section>

            <Separator />

            <Section title="Contact Details">
              <Field icon={Mail} label="Email" value={employee.email} />
              <Field icon={User} label="Phone" value={employee.phone} />
              <Field icon={Mail} label="Alternate Email" value={employee.alternateEmail} />
              <Field icon={User} label="Address" value={employee.address} />
              <Field icon={User} label="City" value={employee.city} />
              <Field icon={User} label="State" value={employee.state} />
              <Field icon={User} label="Country" value={employee.country} />
              <Field icon={User} label="Postal Code" value={employee.zipCode} />
            </Section>

          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
