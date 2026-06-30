"use client"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldSet, FieldLegend } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { INDUSTRIES } from "@/lib/industries";

/** Editable subset of a Client. Maps 1:1 to the backend POST/PUT body. */
export type ClientValues = Record<string, string>;

export const EMPTY_VALUES: ClientValues = {
  name: "",
  email: "",
  password: "",
  company: "",
  clientType: "",
  industry: "",
  websiteUrl: "",
  primaryContact: "",
  designation: "",
  mobileNumber: "",
  alternatePhone: "",
  whatsappNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateProvince: "",
  country: "",
  postalCode: "",
  gstNumber: "",
  panNumber: "",
  companyRegNumber: "",
  taxId: "",
  projectName: "",
  serviceRequired: "",
  projectBudget: "",
  expectedStartDate: "",
  expectedEndDate: "",
  billingContactName: "",
  billingEmail: "",
  paymentTerms: "",
  currency: "",
  creditLimit: "",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifscCode: "",
  branchName: "",
  accountType: "",
  upiId: "",
  preferredContactMethod: "",
  preferredTimeZone: "",
  status: "",
  sourceOfLead: "",
  notes: "",
  assignedSalesPerson: "",
  assignedProjectManager: "",
};

/** Start values for the edit form — strips backend-only/uneditable keys. */
export function valuesFromClient(client: Record<string, unknown>): ClientValues {
  const out: ClientValues = { ...EMPTY_VALUES };
  for (const k of Object.keys(out)) {
    const v = client[k];
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export function payloadFromValues(values: ClientValues): Record<string, unknown> {
  return {
    name: values.name,
    email: values.email,
    password: values.password,
    company: values.company,
    clientType: values.clientType,
    industry: values.industry,
    websiteUrl: values.websiteUrl,
    primaryContact: values.primaryContact,
    designation: values.designation,
    mobileNumber: values.mobileNumber,
    alternatePhone: values.alternatePhone,
    whatsappNumber: values.whatsappNumber,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2,
    city: values.city,
    stateProvince: values.stateProvince,
    country: values.country,
    postalCode: values.postalCode,
    gstNumber: values.gstNumber,
    panNumber: values.panNumber,
    companyRegNumber: values.companyRegNumber,
    taxId: values.taxId,
    projectName: values.projectName,
    serviceRequired: values.serviceRequired,
    projectBudget: values.projectBudget,
    expectedStartDate: values.expectedStartDate,
    expectedEndDate: values.expectedEndDate,
    billingContactName: values.billingContactName,
    billingEmail: values.billingEmail,
    paymentTerms: values.paymentTerms,
    currency: values.currency,
    creditLimit: values.creditLimit,
    bankName: values.bankName,
    accountHolderName: values.accountHolderName,
    accountNumber: values.accountNumber,
    confirmAccountNumber: values.confirmAccountNumber,
    ifscCode: values.ifscCode,
    branchName: values.branchName,
    accountType: values.accountType,
    upiId: values.upiId,
    preferredContactMethod: values.preferredContactMethod,
    preferredTimeZone: values.preferredTimeZone,
    status: values.status,
    sourceOfLead: values.sourceOfLead,
    notes: values.notes,
    assignedSalesPerson: values.assignedSalesPerson,
    assignedProjectManager: values.assignedProjectManager,
  };
}

export function fieldClass(errors: Record<string, string>, name: string): string {
  return errors[name] ? "border-red-500 focus-visible:ring-red-400" : "";
}

export function fieldError(errors: Record<string, string>, name: string): string | null {
  return errors[name] || null;
}

/** Full create form (includes generated-password + identity fields). */
export function CreateClientFormFields(props: {
  v: ClientValues;
  set: (key: string, value: string) => void;
  errors: Record<string, string>;
  members: string[];
  showPassword: boolean;
  onTogglePassword: () => void;
  onRegeneratePassword: () => void;
  copyToClipboard: (text: string, label: string) => void;
  copied: string;
  PasswordIcon: React.ComponentType<{ className?: string }>;
  RefreshCw: React.ComponentType<{ className?: string }>;
  Copy: React.ComponentType<{ className?: string }>;
}) {
  const { v, set, errors, members } = props;
  const fc = (n: string) => fieldClass(errors, n);
  const fe = (n: string) => fieldError(errors, n);
  return (
    <div className="space-y-8 py-2">
      <FieldSet>
        <FieldLegend>Client Information</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field>
            <Label className="text-xs text-muted-foreground">Client ID</Label>
            <Input value="Auto Generated" disabled className="text-muted-foreground" />
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Client Name *</Label>
            <Input placeholder="Enter client name" value={v.name} onChange={(e) => set("name", e.target.value)} className={fc("name")} />
            {fe("name") && <p className="text-xs text-red-500 mt-1">{fe("name")}</p>}
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Company Name *</Label>
            <Input placeholder="Enter company name" value={v.company} onChange={(e) => set("company", e.target.value)} className={fc("company")} />
            {fe("company") && <p className="text-xs text-red-500 mt-1">{fe("company")}</p>}
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address *</Label>
            <Input placeholder="client@company.com" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} className={fc("email")} />
            {fe("email") && <p className="text-xs text-red-500 mt-1">{fe("email")}</p>}
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Generated Password</Label>
            <div className="flex gap-2">
              <Input value={v.password} readOnly className="font-mono text-xs flex-1" />
              <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" onClick={props.onRegeneratePassword} title="Regenerate password">
                <props.RefreshCw className="size-4" />
              </Button>
            </div>
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Client Type</Label>
            <Select value={v.clientType} onValueChange={(val) => set("clientType", val)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Individual">Individual</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Government">Government</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <SearchableSelect id="client-industry" label="Industry" options={INDUSTRIES} value={v.industry} onValueChange={(val) => set("industry", val)} placeholder="Select industry" />
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Website URL</Label>
            <Input placeholder="https://example.com" value={v.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} />
          </Field>
        </div>
      </FieldSet>

      <ClientMainFormFields v={v} set={set} errors={errors} members={members} />
    </div>
  );
}

/** Edit form (no password/identity, since those belong to the client-user account). */
export function EditClientFormFields(props: {
  v: ClientValues;
  set: (key: string, value: string) => void;
  errors: Record<string, string>;
  members: string[];
}) {
  return (
    <div className="space-y-8 py-2">
      <FieldSet>
        <FieldLegend>Client Information</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Client Name *</Label>
            <Input placeholder="Enter client name" value={props.v.name} onChange={(e) => props.set("name", e.target.value)} className={fieldClass(props.errors, "name")} />
            {fieldError(props.errors, "name") && <p className="text-xs text-red-500 mt-1">{fieldError(props.errors, "name")}</p>}
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Company Name *</Label>
            <Input placeholder="Enter company name" value={props.v.company} onChange={(e) => props.set("company", e.target.value)} className={fieldClass(props.errors, "company")} />
            {fieldError(props.errors, "company") && <p className="text-xs text-red-500 mt-1">{fieldError(props.errors, "company")}</p>}
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address *</Label>
            <Input placeholder="client@company.com" type="email" value={props.v.email} onChange={(e) => props.set("email", e.target.value)} className={fieldClass(props.errors, "email")} />
            {fieldError(props.errors, "email") && <p className="text-xs text-red-500 mt-1">{fieldError(props.errors, "email")}</p>}
          </Field>
        </div>
      </FieldSet>
      <ClientMainFormFields v={props.v} set={props.set} errors={props.errors} members={props.members} />
    </div>
  );
}

/** Shared sections between create and edit (contact → additional). */
export function ClientMainFormFields(props: {
  v: ClientValues;
  set: (key: string, value: string) => void;
  errors: Record<string, string>;
  members: string[];
}) {
  const { v, set, errors, members } = props;
  const fc = (n: string) => fieldClass(errors, n);
  const fe = (n: string) => fieldError(errors, n);
  return (
    <>
      <Separator />
      <FieldSet>
        <FieldLegend>Contact Information</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Primary Contact Person *</Label>
            <Input placeholder="Enter contact person" value={v.primaryContact} onChange={(e) => set("primaryContact", e.target.value)} className={fc("primaryContact")} />
            {fe("primaryContact") && <p className="text-xs text-red-500 mt-1">{fe("primaryContact")}</p>}
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Designation</Label>
            <Input placeholder="Enter designation" value={v.designation} onChange={(e) => set("designation", e.target.value)} />
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Mobile Number *</Label>
            <Input placeholder="Enter mobile number" value={v.mobileNumber} onChange={(e) => set("mobileNumber", e.target.value)} />
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Alternate Phone Number</Label>
            <Input placeholder="Enter alternate phone" value={v.alternatePhone} onChange={(e) => set("alternatePhone", e.target.value)} />
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp Number</Label>
            <Input placeholder="Enter WhatsApp number" value={v.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} />
          </Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Address Details</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Address Line 1 *</Label><Input placeholder="Enter address" value={v.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Address Line 2</Label><Input placeholder="Enter address line 2" value={v.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">City *</Label><Input placeholder="Enter city" value={v.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">State/Province *</Label><Input placeholder="Enter state/province" value={v.stateProvince} onChange={(e) => set("stateProvince", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Country *</Label><Input placeholder="Enter country" value={v.country} onChange={(e) => set("country", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Postal Code *</Label><Input placeholder="Enter postal code" value={v.postalCode} onChange={(e) => set("postalCode", e.target.value)} /></Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Business Details</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">GST Number</Label><Input placeholder="Enter GST number" value={v.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">PAN Number</Label><Input placeholder="Enter PAN number" value={v.panNumber} onChange={(e) => set("panNumber", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Company Registration Number</Label><Input placeholder="Enter registration number" value={v.companyRegNumber} onChange={(e) => set("companyRegNumber", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Tax ID</Label><Input placeholder="Enter tax ID" value={v.taxId} onChange={(e) => set("taxId", e.target.value)} /></Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Project Information</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Project Name</Label><Input placeholder="Enter project name" value={v.projectName} onChange={(e) => set("projectName", e.target.value)} /></Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Service Required</Label>
            <Select value={v.serviceRequired} onValueChange={(val) => set("serviceRequired", val)}>
              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Website Development">Website Development</SelectItem>
                <SelectItem value="Mobile App Development">Mobile App Development</SelectItem>
                <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                <SelectItem value="SEO">SEO</SelectItem>
                <SelectItem value="Branding">Branding</SelectItem>
                <SelectItem value="Graphic Design">Graphic Design</SelectItem>
                <SelectItem value="Custom Software">Custom Software</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Project Budget</Label><Input placeholder="Enter budget" value={v.projectBudget} onChange={(e) => set("projectBudget", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Expected Start Date</Label><Input type="date" value={v.expectedStartDate} onChange={(e) => set("expectedStartDate", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Expected End Date</Label><Input type="date" value={v.expectedEndDate} onChange={(e) => set("expectedEndDate", e.target.value)} /></Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Billing Information</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Billing Contact Name</Label><Input placeholder="Enter billing contact" value={v.billingContactName} onChange={(e) => set("billingContactName", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Billing Email</Label><Input placeholder="Enter billing email" type="email" value={v.billingEmail} onChange={(e) => set("billingEmail", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Payment Terms</Label><Input placeholder="Enter payment terms" value={v.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} /></Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Currency</Label>
            <Select value={v.currency} onValueChange={(val) => set("currency", val)}>
              <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="INR">INR</SelectItem>
                <SelectItem value="AED">AED</SelectItem>
                <SelectItem value="AUD">AUD</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Credit Limit</Label><Input placeholder="Enter credit limit" value={v.creditLimit} onChange={(e) => set("creditLimit", e.target.value)} /></Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Bank Details</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Bank Name</Label><Input placeholder="Enter bank name" value={v.bankName} onChange={(e) => set("bankName", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Account Holder Name</Label><Input placeholder="Enter account holder name" value={v.accountHolderName} onChange={(e) => set("accountHolderName", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Account Number</Label><Input placeholder="Enter account number" value={v.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Confirm Account Number</Label><Input placeholder="Re-enter account number" value={v.confirmAccountNumber} onChange={(e) => set("confirmAccountNumber", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">IFSC Code / Routing No.</Label><Input placeholder="Enter IFSC or routing number" value={v.ifscCode} onChange={(e) => set("ifscCode", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Branch Name</Label><Input placeholder="Enter branch name" value={v.branchName} onChange={(e) => set("branchName", e.target.value)} /></Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Account Type</Label>
            <Select value={v.accountType} onValueChange={(val) => set("accountType", val)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Savings">Savings</SelectItem>
                <SelectItem value="Current">Current</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">UPI ID / PayPal Email</Label><Input placeholder="Enter UPI ID or PayPal email" value={v.upiId} onChange={(e) => set("upiId", e.target.value)} /></Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Communication Preferences</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Preferred Contact Method</Label>
            <Select value={v.preferredContactMethod} onValueChange={(val) => set("preferredContactMethod", val)}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Phone">Phone</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Teams">Teams</SelectItem>
                <SelectItem value="Zoom">Zoom</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Preferred Time Zone</Label><Input placeholder="e.g. IST, EST, PST" value={v.preferredTimeZone} onChange={(e) => set("preferredTimeZone", e.target.value)} /></Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Client Status</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <Select value={v.status} onValueChange={(val) => set("status", val)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Prospect">Prospect</SelectItem>
                <SelectItem value="Active Client">Active Client</SelectItem>
                <SelectItem value="Inactive Client">Inactive Client</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Additional Information</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <Select value={v.sourceOfLead} onValueChange={(val) => set("sourceOfLead", val)}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Social Media">Social Media</SelectItem>
                <SelectItem value="BNI">BNI</SelectItem>
                <SelectItem value="Advertisement">Advertisement</SelectItem>
                <SelectItem value="Direct Contact">Direct Contact</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field />
        </div>
        <div className="mt-4">
          <Label className="text-xs text-muted-foreground mb-1.5 block">Notes</Label>
          <textarea
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
            placeholder="Enter notes"
            value={v.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>System Fields</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field>
            <Select value={v.assignedSalesPerson} onValueChange={(val) => set("assignedSalesPerson", val)}>
              <SelectTrigger><SelectValue placeholder="Select sales person" /></SelectTrigger>
              <SelectContent>{members.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
            </Select>
          </Field>
          <Field>
            <Select value={v.assignedProjectManager} onValueChange={(val) => set("assignedProjectManager", val)}>
              <SelectTrigger><SelectValue placeholder="Select project manager" /></SelectTrigger>
              <SelectContent>{members.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
            </Select>
          </Field>
        </div>
      </FieldSet>
    </>
  );
}
