"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PincodeInput, LocationSelect } from "@/components/ui/location-fields";
import { INDUSTRIES } from "@/lib/industries";
import { ArrowRight, ArrowLeft, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyDetailsFormProps {
  onSubmit: (data: CompanyDetails) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export interface CompanyDetails {
  businessType: string;
  industry: string;
  gstNumber: string;
  panNumber: string;
  cinNumber: string;
  companyEmail: string;
  mobileNumber: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  authorizedPersonName: string;
  designation: string;
  authorizedPersonEmail: string;
  authorizedPersonMobile: string;
  numberOfEmployees: string;
  companyDescription: string;
}

const businessTypes = [
  "Sole Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited",
  "Public Limited",
  "One Person Company",
  "Other",
];

const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Other",
];

export function CompanyDetailsForm({ onSubmit, onBack, isSubmitting }: CompanyDetailsFormProps) {
  const [form, setForm] = useState<CompanyDetails>({
    businessType: "",
    industry: "",
    gstNumber: "",
    panNumber: "",
    cinNumber: "",
    companyEmail: "",
    mobileNumber: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    authorizedPersonName: "",
    designation: "",
    authorizedPersonEmail: "",
    authorizedPersonMobile: "",
    numberOfEmployees: "",
    companyDescription: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pincodeResult, setPincodeResult] = useState<{cities: string[]; states: string[]; countries: string[]} | null>(null);

  const update = (field: keyof CompanyDetails, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRe = /^[+\d][\d\s()-]{6,}$/;
  const pincodeRe = /^\d{4,6}$/;
  const panRe = /^[A-Z]{5}\d{4}[A-Z]$/;
  const gstRe = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d][Z][A-Z\d]$/;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.businessType) newErrors.businessType = "Required";
    if (!form.industry) newErrors.industry = "Required";
    if (!form.companyEmail) newErrors.companyEmail = "Required";
    else if (!emailRe.test(form.companyEmail)) newErrors.companyEmail = "Invalid email";
    if (!form.mobileNumber) newErrors.mobileNumber = "Required";
    else if (!phoneRe.test(form.mobileNumber)) newErrors.mobileNumber = "Invalid phone";
    if (!form.addressLine1) newErrors.addressLine1 = "Required";
    if (!form.city) newErrors.city = "Required";
    if (!form.state) newErrors.state = "Required";
    if (!form.pincode) newErrors.pincode = "Required";
    else if (!pincodeRe.test(form.pincode)) newErrors.pincode = "Invalid pincode";
    if (!form.authorizedPersonName) newErrors.authorizedPersonName = "Required";
    if (!form.authorizedPersonEmail) newErrors.authorizedPersonEmail = "Required";
    else if (!emailRe.test(form.authorizedPersonEmail)) newErrors.authorizedPersonEmail = "Invalid email";
    if (form.authorizedPersonMobile && !phoneRe.test(form.authorizedPersonMobile)) newErrors.authorizedPersonMobile = "Invalid phone";
    if (form.panNumber && !panRe.test(form.panNumber)) newErrors.panNumber = "Invalid PAN";
    if (form.gstNumber && !gstRe.test(form.gstNumber)) newErrors.gstNumber = "Invalid GST";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(form);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8">
      {Object.keys(errors).length > 0 && (
        <div className="rounded-sm border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          Fix {Object.keys(errors).length} field{Object.keys(errors).length === 1 ? "" : "s"} above.
        </div>
      )}
      <fieldset className="rounded-sm border p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">Business Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Business Type *</Label>
            <Select value={form.businessType} onValueChange={(v) => update("businessType", v)}>
              <SelectTrigger className={cn(errors.businessType && "border-destructive")}>
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.businessType && <p className="text-xs text-destructive mt-1">{errors.businessType}</p>}
          </div>
          <div className="space-y-1.5">
            <SearchableSelect
              id="industry"
              label="Industry"
              required
              options={INDUSTRIES}
              value={form.industry}
              onValueChange={(v) => update("industry", v)}
              placeholder=""
              error={errors.industry}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">GST Number</Label>
            <Input id="gstNumber" value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} placeholder="" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">PAN Number</Label>
            <Input id="panNumber" value={form.panNumber} onChange={(e) => update("panNumber", e.target.value.toUpperCase())} placeholder="" />
            {errors.panNumber && <p className="text-xs text-destructive mt-1">{errors.panNumber}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">CIN Number</Label>
            <Input id="cinNumber" value={form.cinNumber} onChange={(e) => update("cinNumber", e.target.value)} placeholder="" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Number of Employees</Label>
            <Input id="numberOfEmployees" type="number" value={form.numberOfEmployees} onChange={(e) => update("numberOfEmployees", e.target.value)} placeholder="" />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-sm border p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">Contact Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Company Email *</Label>
            <Input id="companyEmail" type="email" value={form.companyEmail} onChange={(e) => update("companyEmail", e.target.value)} placeholder="" className={cn(errors.companyEmail && "border-destructive")} />
            {errors.companyEmail && <p className="text-xs text-destructive mt-1">{errors.companyEmail}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mobile Number *</Label>
            <PhoneInput id="mobileNumber" value={form.mobileNumber} onChange={(value) => update("mobileNumber", value)} placeholder="" className={cn(errors.mobileNumber && "border-destructive")} />
            {errors.mobileNumber && <p className="text-xs text-destructive mt-1">{errors.mobileNumber}</p>}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="website" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="" className="pl-9" />
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-sm border p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">Address</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Address Line 1 *</Label>
            <Input id="addressLine1" value={form.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} placeholder="" className={cn(errors.addressLine1 && "border-destructive")} />
            {errors.addressLine1 && <p className="text-xs text-destructive mt-1">{errors.addressLine1}</p>}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Address Line 2</Label>
            <Input id="addressLine2" value={form.addressLine2} onChange={(e) => update("addressLine2", e.target.value)} placeholder="" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">City *</Label>
            <LocationSelect options={pincodeResult?.cities || []} value={form.city} onChange={(v) => update("city", v)} placeholder="" className={cn(errors.city && "border-destructive")} />
            {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">State *</Label>
            <LocationSelect options={pincodeResult?.states || []} value={form.state} onChange={(v) => update("state", v)} placeholder="" className={cn(errors.state && "border-destructive")} />
            {errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pincode *</Label>
            <PincodeInput value={form.pincode} onChange={(v) => update("pincode", v)} onResult={setPincodeResult} className={cn(errors.pincode && "border-destructive")} />
            {errors.pincode && <p className="text-xs text-destructive mt-1">{errors.pincode}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Country</Label>
            <LocationSelect options={pincodeResult?.countries || []} value={form.country} onChange={(v) => update("country", v)} placeholder="" />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-sm border p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">Authorized Person</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name *</Label>
            <Input id="authorizedPersonName" value={form.authorizedPersonName} onChange={(e) => update("authorizedPersonName", e.target.value)} placeholder="" className={cn(errors.authorizedPersonName && "border-destructive")} />
            {errors.authorizedPersonName && <p className="text-xs text-destructive mt-1">{errors.authorizedPersonName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Designation</Label>
            <Input id="designation" value={form.designation} onChange={(e) => update("designation", e.target.value)} placeholder="" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email *</Label>
            <Input id="authorizedPersonEmail" type="email" value={form.authorizedPersonEmail} onChange={(e) => update("authorizedPersonEmail", e.target.value)} placeholder="" className={cn(errors.authorizedPersonEmail && "border-destructive")} />
            {errors.authorizedPersonEmail && <p className="text-xs text-destructive mt-1">{errors.authorizedPersonEmail}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mobile</Label>
            <PhoneInput id="authorizedPersonMobile" value={form.authorizedPersonMobile} onChange={(value) => update("authorizedPersonMobile", value)} placeholder="" />
            {errors.authorizedPersonMobile && <p className="text-xs text-destructive mt-1">{errors.authorizedPersonMobile}</p>}
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-sm border p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">Company Description</legend>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Company Description</Label>
          <Textarea id="companyDescription" value={form.companyDescription} onChange={(e) => update("companyDescription", e.target.value)} placeholder="" rows={3} />
        </div>
      </fieldset>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[160px]">
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="size-4 animate-spin rounded-sm border-2 border-current border-t-transparent" />
              Saving...
            </div>
          ) : (
            <>
              Complete Setup
              <ArrowRight className="ml-2 size-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
