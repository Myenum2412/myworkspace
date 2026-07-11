"use client"
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { PincodeInput, LocationSelect } from "@/components/ui/location-fields";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldSet, FieldLegend } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";


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



/** Edit form — single cohesive form for client editing. */
export function EditClientFormFields(props: {
  v: ClientValues;
  set: (key: string, value: string) => void;
  errors: Record<string, string>;
  members: string[];
}) {
  const { v, set, errors, members } = props;
  const [showPw, setShowPw] = useState(false);
  const [pincodeResult, setPincodeResult] = useState<{cities: string[]; states: string[]; countries: string[]} | null>(null);
  const fc = (n: string) => fieldClass(errors, n);
  const fe = (n: string) => fieldError(errors, n);
  return (
    <div className="space-y-8 py-2 [&_input]:border-black [&_select>button]:border-black [&_textarea]:border-black">
      <FieldSet>
        <FieldLegend>Client Information</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Client Name *</Label>
            <Input placeholder="" value={v.name} onChange={(e) => set("name", e.target.value)} className={fc("name")} />
            {fe("name") && <p className="text-xs text-red-500 mt-1">{fe("name")}</p>}
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Company Name *</Label>
            <Input placeholder="" value={v.company} onChange={(e) => set("company", e.target.value)} className={fc("company")} />
            {fe("company") && <p className="text-xs text-red-500 mt-1">{fe("company")}</p>}
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address *</Label>
            <Input placeholder="" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} className={fc("email")} />
            {fe("email") && <p className="text-xs text-red-500 mt-1">{fe("email")}</p>}
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Password</Label>
            <div className="relative">
              <Input placeholder="" type={showPw ? "text" : "password"} value={v.password} onChange={(e) => set("password", e.target.value)} className={fc("password")} />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {fe("password") && <p className="text-xs text-red-500 mt-1">{fe("password")}</p>}
          </Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Contact Information</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Primary Contact Person *</Label>
            <Input placeholder="" value={v.primaryContact} onChange={(e) => set("primaryContact", e.target.value)} className={fc("primaryContact")} />
            {fe("primaryContact") && <p className="text-xs text-red-500 mt-1">{fe("primaryContact")}</p>}
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Designation</Label>
            <Input placeholder="" value={v.designation} onChange={(e) => set("designation", e.target.value)} />
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Mobile Number *</Label>
            <PhoneInput value={v.mobileNumber} onChange={(value) => set("mobileNumber", value)} placeholder="" />
          </Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Alternate Phone Number</Label>
            <PhoneInput value={v.alternatePhone} onChange={(value) => set("alternatePhone", value)} placeholder="" />
          </Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Address Details</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Address Line 1 *</Label><Input placeholder="" value={v.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Address Line 2</Label><Input placeholder="" value={v.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">City *</Label><LocationSelect options={pincodeResult?.cities || []} value={v.city} onChange={(val) => set("city", val)} placeholder="" /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">State/Province *</Label><LocationSelect options={pincodeResult?.states || []} value={v.stateProvince} onChange={(val) => set("stateProvince", val)} placeholder="" /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Country *</Label><LocationSelect options={pincodeResult?.countries || []} value={v.country} onChange={(val) => set("country", val)} placeholder="" /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Postal Code *</Label><PincodeInput value={v.postalCode} onChange={(val) => set("postalCode", val)} onResult={setPincodeResult} /></Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Business Details</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">GST Number</Label><Input placeholder="" value={v.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">PAN Number</Label><Input placeholder="" value={v.panNumber} onChange={(e) => set("panNumber", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Company Registration Number</Label><Input placeholder="" value={v.companyRegNumber} onChange={(e) => set("companyRegNumber", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Tax ID</Label><Input placeholder="" value={v.taxId} onChange={(e) => set("taxId", e.target.value)} /></Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Project Information</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Project Name</Label><Input placeholder="" value={v.projectName} onChange={(e) => set("projectName", e.target.value)} /></Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Service Required</Label>
            <Select value={v.serviceRequired} onValueChange={(val) => set("serviceRequired", val)}>
              <SelectTrigger><SelectValue placeholder="" /></SelectTrigger>
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
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Project Budget</Label><Input placeholder="" value={v.projectBudget} onChange={(e) => set("projectBudget", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Expected Start Date</Label><Input type="date" value={v.expectedStartDate} onChange={(e) => set("expectedStartDate", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Expected End Date</Label><Input type="date" value={v.expectedEndDate} onChange={(e) => set("expectedEndDate", e.target.value)} /></Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Billing Information</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Billing Contact Name</Label><Input placeholder="" value={v.billingContactName} onChange={(e) => set("billingContactName", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Billing Email</Label><Input placeholder="" type="email" value={v.billingEmail} onChange={(e) => set("billingEmail", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Payment Terms</Label><Input placeholder="" value={v.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} /></Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Currency</Label>
            <Select value={v.currency} onValueChange={(val) => set("currency", val)}>
              <SelectTrigger><SelectValue placeholder="" /></SelectTrigger>
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
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Credit Limit</Label><Input placeholder="" value={v.creditLimit} onChange={(e) => set("creditLimit", e.target.value)} /></Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Bank Details</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Bank Name</Label><Input placeholder="" value={v.bankName} onChange={(e) => set("bankName", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Account Holder Name</Label><Input placeholder="" value={v.accountHolderName} onChange={(e) => set("accountHolderName", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Account Number</Label><Input placeholder="" value={v.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Confirm Account Number</Label><Input placeholder="" value={v.confirmAccountNumber} onChange={(e) => set("confirmAccountNumber", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">IFSC Code / Routing No.</Label><Input placeholder="" value={v.ifscCode} onChange={(e) => set("ifscCode", e.target.value)} /></Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Branch Name</Label><Input placeholder="" value={v.branchName} onChange={(e) => set("branchName", e.target.value)} /></Field>
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Account Type</Label>
            <Select value={v.accountType} onValueChange={(val) => set("accountType", val)}>
              <SelectTrigger><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Savings">Savings</SelectItem>
                <SelectItem value="Current">Current</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">UPI ID / PayPal Email</Label><Input placeholder="" value={v.upiId} onChange={(e) => set("upiId", e.target.value)} /></Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Communication Preferences</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Preferred Contact Method</Label>
            <Select value={v.preferredContactMethod} onValueChange={(val) => set("preferredContactMethod", val)}>
              <SelectTrigger><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Phone">Phone</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Teams">Teams</SelectItem>
                <SelectItem value="Zoom">Zoom</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field><Label className="text-xs text-muted-foreground mb-1.5 block">Preferred Time Zone</Label><Input placeholder="" value={v.preferredTimeZone} onChange={(e) => set("preferredTimeZone", e.target.value)} /></Field>
        </div>
      </FieldSet>

      <Separator />
      <FieldSet>
        <FieldLegend>Client Status</FieldLegend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <Select value={v.status} onValueChange={(val) => set("status", val)}>
              <SelectTrigger><SelectValue placeholder="" /></SelectTrigger>
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
              <SelectTrigger><SelectValue placeholder="" /></SelectTrigger>
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
            placeholder=""
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
              <SelectTrigger><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>{members.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
            </Select>
          </Field>
          <Field>
            <Select value={v.assignedProjectManager} onValueChange={(val) => set("assignedProjectManager", val)}>
              <SelectTrigger><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>{members.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
            </Select>
          </Field>
        </div>
      </FieldSet>
    </div>
  );
}
