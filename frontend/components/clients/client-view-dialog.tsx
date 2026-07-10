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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Mail, Phone, MapPin, Globe, User, Briefcase,
  Hash, FileText, Calendar, CreditCard, Banknote, Tag, Info,
} from "lucide-react";
import type { Client } from "@/app/clients/columns";

type ClientViewDialogProps = {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Field({ icon: Icon, label, value }: { icon?: React.FC<{ className?: string }>; label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
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
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Info className="size-3.5" />
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {children}
      </div>
    </div>
  );
}

export function ClientViewDialog({ client, open, onOpenChange }: ClientViewDialogProps) {
  if (!client) return null;

  const statusColorMap: Record<string, string> = {
    "Lead": "bg-gray-200 text-gray-700",
    "Prospect": "bg-gray-700 text-white",
    "Active Client": "bg-green-50 text-green-700",
    "Inactive Client": "bg-gray-100 text-gray-700",
    "Completed": "bg-purple-50 text-purple-700",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Building2 className="size-5 text-muted-foreground" />
                {client.name}
              </DialogTitle>
              <DialogDescription className="mt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {client.company && <span className="text-sm font-medium">{client.company}</span>}
                  <Badge className={statusColorMap[client.status] || "bg-gray-100 text-gray-700"}>
                    {client.status}
                  </Badge>
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6 pb-4">

            <Section title="Basic Information">
              <Field icon={User} label="Client Name" value={client.name} />
              <Field icon={Mail} label="Email" value={client.email} />
              <Field icon={User} label="Username" value={client.username} />
              <Field icon={Building2} label="Company" value={client.company} />
              <Field icon={Tag} label="Client Type" value={client.clientType} />
              <Field icon={Hash} label="Industry" value={client.industry} />
              <Field icon={Globe} label="Website" value={client.websiteUrl} />
              <Field icon={User} label="Primary Contact" value={client.primaryContact} />
              <Field icon={Briefcase} label="Designation" value={client.designation} />
              <Field icon={Hash} label="Project Count" value={client.projects} />
            </Section>

            <Separator />

            <Section title="Contact Details">
              <Field icon={Phone} label="Mobile Number" value={client.mobileNumber} />
              <Field icon={Phone} label="Alternate Phone" value={client.alternatePhone} />
              <Field icon={MapPin} label="Address Line 1" value={client.addressLine1} />
              <Field icon={MapPin} label="Address Line 2" value={client.addressLine2} />
              <Field icon={MapPin} label="City" value={client.city} />
              <Field icon={MapPin} label="State / Province" value={client.stateProvince} />
              <Field icon={MapPin} label="Country" value={client.country} />
              <Field icon={Hash} label="Postal Code" value={client.postalCode} />
            </Section>

            <Separator />

            <Section title="Tax & Registration">
              <Field icon={FileText} label="GST Number" value={client.gstNumber} />
              <Field icon={FileText} label="PAN Number" value={client.panNumber} />
              <Field icon={FileText} label="Company Reg. Number" value={client.companyRegNumber} />
              <Field icon={FileText} label="Tax ID" value={client.taxId} />
            </Section>

            <Separator />

            <Section title="Project Details">
              <Field icon={Briefcase} label="Project Name" value={client.projectName} />
              <Field icon={FileText} label="Service Required" value={client.serviceRequired} />
              <Field icon={Banknote} label="Project Budget" value={client.projectBudget} />
              <Field icon={Calendar} label="Expected Start Date" value={client.expectedStartDate ? new Date(client.expectedStartDate).toLocaleDateString() : null} />
              <Field icon={Calendar} label="Expected End Date" value={client.expectedEndDate ? new Date(client.expectedEndDate).toLocaleDateString() : null} />
            </Section>

            <Separator />

            <Section title="Billing Information">
              <Field icon={User} label="Billing Contact Name" value={client.billingContactName} />
              <Field icon={Mail} label="Billing Email" value={client.billingEmail} />
              <Field icon={FileText} label="Payment Terms" value={client.paymentTerms} />
              <Field icon={Banknote} label="Currency" value={client.currency} />
              <Field icon={Hash} label="Credit Limit" value={client.creditLimit} />
            </Section>

            <Separator />

            <Section title="Bank Details">
              <Field icon={CreditCard} label="Bank Name" value={client.bankName} />
              <Field icon={User} label="Account Holder Name" value={client.accountHolderName} />
              <Field icon={Hash} label="Account Number" value={client.accountNumber} />
              <Field icon={Hash} label="Confirm Account Number" value={client.confirmAccountNumber} />
              <Field icon={Hash} label="IFSC Code" value={client.ifscCode} />
              <Field icon={Building2} label="Branch Name" value={client.branchName} />
              <Field icon={FileText} label="Account Type" value={client.accountType} />
              <Field icon={Hash} label="UPI ID" value={client.upiId} />
            </Section>

            <Separator />

            <Section title="Additional Information">
              <Field icon={Tag} label="Preferred Contact Method" value={client.preferredContactMethod} />
              <Field icon={Tag} label="Preferred Time Zone" value={client.preferredTimeZone} />
              <Field icon={Tag} label="Source of Lead" value={client.sourceOfLead} />
              <div className="sm:col-span-2 lg:col-span-3">
                <Field icon={FileText} label="Notes" value={client.notes} />
              </div>
            </Section>

            <Separator />

            <Section title="Assignment">
              <Field icon={User} label="Sales Person" value={client.assignedSalesPerson} />
              <Field icon={User} label="Project Manager" value={client.assignedProjectManager} />
              <Field icon={User} label="Created By" value={client.createdBy} />
              <Field icon={Calendar} label="Created Date" value={client.createdDate ? new Date(client.createdDate).toLocaleDateString() : null} />
              <Field icon={Calendar} label="Last Updated" value={client.lastUpdatedDate ? new Date(client.lastUpdatedDate).toLocaleDateString() : null} />
            </Section>

          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
