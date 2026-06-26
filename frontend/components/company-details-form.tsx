"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Building2, MapPin, User, Phone, Globe } from "lucide-react";
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

const industries = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Retail",
  "Real Estate",
  "Consulting",
  "Media & Entertainment",
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

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.businessType) newErrors.businessType = "Required";
    if (!form.industry) newErrors.industry = "Required";
    if (!form.companyEmail) newErrors.companyEmail = "Required";
    if (!form.mobileNumber) newErrors.mobileNumber = "Required";
    if (!form.addressLine1) newErrors.addressLine1 = "Required";
    if (!form.city) newErrors.city = "Required";
    if (!form.state) newErrors.state = "Required";
    if (!form.pincode) newErrors.pincode = "Required";
    if (!form.authorizedPersonName) newErrors.authorizedPersonName = "Required";
    if (!form.authorizedPersonEmail) newErrors.authorizedPersonEmail = "Required";
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
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-8">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="size-5 text-primary" />
          Business Information
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="businessType">Business Type *</Label>
            <Select value={form.businessType} onValueChange={(v) => update("businessType", v)}>
              <SelectTrigger className={cn(errors.businessType && "border-destructive")}>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry *</Label>
            <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
              <SelectTrigger className={cn(errors.industry && "border-destructive")}>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gstNumber">GST Number</Label>
            <Input id="gstNumber" value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} placeholder="22AAAAA0000A1Z5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="panNumber">PAN Number</Label>
            <Input id="panNumber" value={form.panNumber} onChange={(e) => update("panNumber", e.target.value.toUpperCase())} placeholder="AAAAA0000A" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cinNumber">CIN Number</Label>
            <Input id="cinNumber" value={form.cinNumber} onChange={(e) => update("cinNumber", e.target.value)} placeholder="U74999HR2024PTC000000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="numberOfEmployees">Number of Employees</Label>
            <Input id="numberOfEmployees" type="number" value={form.numberOfEmployees} onChange={(e) => update("numberOfEmployees", e.target.value)} placeholder="e.g. 50" />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Phone className="size-5 text-primary" />
          Contact Information
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="companyEmail">Company Email *</Label>
            <Input id="companyEmail" type="email" value={form.companyEmail} onChange={(e) => update("companyEmail", e.target.value)} placeholder="info@company.com" className={cn(errors.companyEmail && "border-destructive")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mobileNumber">Mobile Number *</Label>
            <Input id="mobileNumber" value={form.mobileNumber} onChange={(e) => update("mobileNumber", e.target.value)} placeholder="+91 98765 43210" className={cn(errors.mobileNumber && "border-destructive")} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="website">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="website" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://www.company.com" className="pl-9" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <MapPin className="size-5 text-primary" />
          Address
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="addressLine1">Address Line 1 *</Label>
            <Input id="addressLine1" value={form.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} placeholder="Street address" className={cn(errors.addressLine1 && "border-destructive")} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input id="addressLine2" value={form.addressLine2} onChange={(e) => update("addressLine2", e.target.value)} placeholder="Suite, unit, building, floor" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City *</Label>
            <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="City" className={cn(errors.city && "border-destructive")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State *</Label>
            <Select value={form.state} onValueChange={(v) => update("state", v)}>
              <SelectTrigger className={cn(errors.state && "border-destructive")}>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pincode">Pincode *</Label>
            <Input id="pincode" value={form.pincode} onChange={(e) => update("pincode", e.target.value)} placeholder="000000" className={cn(errors.pincode && "border-destructive")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" value={form.country} onChange={(e) => update("country", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <User className="size-5 text-primary" />
          Authorized Person
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="authorizedPersonName">Name *</Label>
            <Input id="authorizedPersonName" value={form.authorizedPersonName} onChange={(e) => update("authorizedPersonName", e.target.value)} placeholder="Full name" className={cn(errors.authorizedPersonName && "border-destructive")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="designation">Designation</Label>
            <Input id="designation" value={form.designation} onChange={(e) => update("designation", e.target.value)} placeholder="e.g. CEO, Director" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="authorizedPersonEmail">Email *</Label>
            <Input id="authorizedPersonEmail" type="email" value={form.authorizedPersonEmail} onChange={(e) => update("authorizedPersonEmail", e.target.value)} placeholder="person@company.com" className={cn(errors.authorizedPersonEmail && "border-destructive")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="authorizedPersonMobile">Mobile</Label>
            <Input id="authorizedPersonMobile" value={form.authorizedPersonMobile} onChange={(e) => update("authorizedPersonMobile", e.target.value)} placeholder="+91 98765 43210" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="companyDescription">Company Description</Label>
        <Textarea id="companyDescription" value={form.companyDescription} onChange={(e) => update("companyDescription", e.target.value)} placeholder="Brief description of your company..." rows={3} />
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[160px]">
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
