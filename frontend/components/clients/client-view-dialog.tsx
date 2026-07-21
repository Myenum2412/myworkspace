"use client"
import { useEffect, useState } from "react";
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
  Users, Key, Upload, Send, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import type { Client } from "@/app/clients/columns";
import { sendClientWelcomeEmail } from "@/lib/mail";

type ClientViewDialogProps = {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CredentialData = {
  username: string;
  email: string;
  name: string;
  isActive: boolean;
  mustChangePassword: boolean;
};

type FileItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderName: string;
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

function Section({ title, icon: Icon, children }: { title: string; icon?: React.FC<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        {Icon && <Icon className="size-3.5" />}
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {children}
      </div>
    </div>
  );
}

export function ClientViewDialog({ client, open, onOpenChange }: ClientViewDialogProps) {
  const [credentials, setCredentials] = useState<CredentialData | null>(null);
  const [documents, setDocuments] = useState<FileItem[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"idle" | "sent" | "error">("idle");

  useEffect(() => {
    if (!open || !client) return;

    setSendResult("idle");

    setLoadingCreds(true);
    fetch(`/api/clients/credentials?clientId=${client.id}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.success) setCredentials(d.data);
      })
      .catch(() => {})
      .finally(() => setLoadingCreds(false));

    const orgId = (client as any).orgId;
    if (orgId) {
      setLoadingDocs(true);
      fetch(`/api/files?orgId=${orgId}&clientId=${client.id}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          setDocuments(Array.isArray(d) ? d : d.data || []);
        })
        .catch(() => {})
        .finally(() => setLoadingDocs(false));
    }
  }, [client, open]);

  async function handleSendInvite() {
    if (!client || !credentials) return;
    setSending(true);
    setSendResult("idle");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const staffInfo = [
      client.assignedSalesPerson,
      client.assignedProjectManager,
    ].filter(Boolean) as string[];

    const documentsInfo = documents.map(d => d.originalName);

    const result = await sendClientWelcomeEmail(
      client.email,
      client.name,
      credentials.username,
      "",
      `${appUrl}/client/login`,
      staffInfo.length > 0 ? staffInfo : undefined,
      documentsInfo.length > 0 ? documentsInfo : undefined
    );

    setSending(false);
    setSendResult(result.success ? "sent" : "error");
  }

  if (!client) return null;

  const statusColorMap: Record<string, string> = {
    "Lead": "bg-gray-200 text-gray-700",
    "Prospect": "bg-gray-700 text-white",
    "Active Client": "bg-green-50 text-green-700",
    "Inactive Client": "bg-gray-100 text-gray-700",
    "Completed": "bg-purple-50 text-purple-700",
  };

  const staffMembers = [
    { label: "Sales Person", value: client.assignedSalesPerson },
    { label: "Project Manager", value: client.assignedProjectManager },
  ].filter(s => s.value);

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

            <Section title="Assigned Staff" icon={Users}>
              {staffMembers.length > 0 ? staffMembers.map(s => (
                <Field key={s.label} icon={User} label={s.label} value={s.value} />
              )) : (
                <div className="col-span-full text-sm text-muted-foreground py-2">No staff assigned</div>
              )}
            </Section>

            <Separator />

            <Section title="Client Credentials" icon={Key}>
              {loadingCreds ? (
                <div className="col-span-full flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="size-4 animate-spin" />
                  Loading credentials...
                </div>
              ) : credentials ? (
                <>
                  <Field icon={User} label="Username" value={credentials.username} />
                  <Field icon={Mail} label="Email" value={credentials.email} />
                  <Field icon={Tag} label="Status" value={credentials.isActive ? "Active" : "Inactive"} />
                </>
              ) : (
                <div className="col-span-full text-sm text-muted-foreground py-2">Credentials not found</div>
              )}
            </Section>

            <Separator />

            <Section title="Uploaded Documents" icon={Upload}>
              {loadingDocs ? (
                <div className="col-span-full flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="size-4 animate-spin" />
                  Loading documents...
                </div>
              ) : documents.length > 0 ? (
                documents.slice(0, 10).map(doc => (
                  <Field key={doc.id} icon={FileText} label={doc.originalName} value={`${(doc.size / 1024).toFixed(1)} KB`} />
                ))
              ) : (
                <div className="col-span-full text-sm text-muted-foreground py-2">No documents uploaded</div>
              )}
              {documents.length > 10 && (
                <div className="col-span-full text-xs text-muted-foreground">
                  +{documents.length - 10} more documents
                </div>
              )}
            </Section>

            <Separator />

            <Section title="Basic Information" icon={Info}>
              <Field icon={Mail} label="Email" value={client.email} />
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

        <DialogFooter className="shrink-0 border-t px-6 py-4 flex items-center gap-3">
          {sendResult === "sent" && (
            <span className="text-xs text-green-600 flex items-center gap-1 mr-auto">
              <CheckCircle2 className="size-3.5" />
              Invite sent successfully
            </span>
          )}
          {sendResult === "error" && (
            <span className="text-xs text-red-600 flex items-center gap-1 mr-auto">
              <AlertCircle className="size-3.5" />
              Failed to send invite
            </span>
          )}
          <Button
            variant="default"
            onClick={handleSendInvite}
            disabled={sending || !credentials}
          >
            {sending ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="mr-2 size-4" /> Send Invite</>
            )}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
