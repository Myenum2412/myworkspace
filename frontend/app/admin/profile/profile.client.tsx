"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { PincodeInput, LocationSelect } from "@/components/ui/location-fields";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { INDUSTRIES } from "@/lib/industries";
import {
  MailIcon,
  CalendarIcon,
  ShieldIcon,
  Building2Icon,
  CircleIcon,
  CameraIcon,
  XIcon,
  Loader2Icon,
  UserIcon,
  PencilIcon,
  CheckIcon,
  PhoneIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "lucide-react";
import nextDynamic from "next/dynamic";
import { useProfileForm, planLabels, statusColors, roleBadge } from "@/hooks/use-profile-form";
import type { ProfileData } from "@/hooks/use-profile-form";

const BannerUpload = nextDynamic(
  () => import("@/components/ui/file-upload-1").then((m) => m.BannerUpload),
  { ssr: false }
);
const ProfileImageUpload = nextDynamic(
  () => import("@/components/ui/profile-image-upload").then((m) => m.ProfileImageUpload),
  { ssr: false }
);

type AdminProfilePageClientProps = {
  data: ProfileData;
};

export function AdminProfilePageClient({ data: initialData }: AdminProfilePageClientProps) {
  const form = useProfileForm(initialData);

  const {
    data, editing, setEditing, saving, saveError, setSaveError, saveSuccess, setSaveSuccess,
    bannerUrl, profileImage,
    editName, setEditName, editEmail, setEditEmail, editPhone, setEditPhone,
    editDepartment, setEditDepartment, editCompany, setEditCompany,
    editAddress, setEditAddress, editCity, setEditCity, editState, setEditState,
    editCountry, setEditCountry, editZipCode, setEditZipCode,
    editLinkedin, setEditLinkedin, editGithub, setEditGithub,
    editTwitter, setEditTwitter, editWebsite, setEditWebsite,
    editCompanyName, setEditCompanyName,
    editBusinessType, setEditBusinessType, editIndustry, setEditIndustry,
    editGstNumber, setEditGstNumber, editPanNumber, setEditPanNumber,
    editCinNumber, setEditCinNumber, editCompanyEmail, setEditCompanyEmail,
    editMobileNumber, setEditMobileNumber, editAltMobile, setEditAltMobile,
    editOrgWebsite, setEditOrgWebsite,
    editAddressLine1, setEditAddressLine1, editAddressLine2, setEditAddressLine2,
    editOrgCity, setEditOrgCity, editOrgState, setEditOrgState,
    editPincode, setEditPincode, editOrgCountry, setEditOrgCountry,
    editAuthorizedPerson, setEditAuthorizedPerson, editDesignation, setEditDesignation,
    editAuthorizedEmail, setEditAuthorizedEmail, editAuthorizedMobile, setEditAuthorizedMobile,
    editNumEmployees, setEditNumEmployees, editCompanyDesc, setEditCompanyDesc,
    showBannerEditor, setShowBannerEditor, showImageEditor, setShowImageEditor,
    urlInput, setUrlInput, uploading, uploadingImage, fileKey, imageFileKey,
    dbUser, org,
    handleSave, handleCancel, updateBanner, handleBannerFile,
    removeProfileImage, handleProfileImageFile,
  } = form;

  const [pincodeResult, setPincodeResult] = useState<{cities: string[]; states: string[]; countries: string[]} | null>(null);
  const [orgPincodeResult, setOrgPincodeResult] = useState<{cities: string[]; states: string[]; countries: string[]} | null>(null);

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div
          className="relative h-[200px] bg-gradient-to-b from-primary/90 via-primary/40 to-background bg-cover bg-center"
          style={bannerUrl ? { backgroundImage: "url(" + bannerUrl + ")" } : undefined}
        >
        </div>

        <div className="flex flex-col items-center -mt-12 px-6">
          <div className="relative group">
            <Avatar className="size-24 ring-4 ring-background shadow-xl">
              <AvatarImage src={profileImage || dbUser?.image} alt={dbUser?.name} />
              <AvatarFallback className="text-2xl">{dbUser?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => setShowImageEditor(true)}
              className="absolute -bottom-1 -right-1 flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
              aria-label="Edit profile photo"
            >
              <CameraIcon className="size-4" />
            </button>
          </div>

          <h1 className="mt-3 text-2xl font-bold">{dbUser?.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <span className="flex items-center gap-1.5 text-sm">
              <span className={"inline-block size-2 rounded-full " + (statusColors[dbUser?.status || "offline"])} />
              {dbUser?.status ? dbUser.status.charAt(0).toUpperCase() + dbUser.status.slice(1) : "Offline"}
            </span>
            <span aria-hidden>&middot;</span>
            <Badge variant={roleBadge[dbUser?.role || "member"]}>
              {dbUser?.role ? dbUser.role.charAt(0).toUpperCase() + dbUser.role.slice(1) : "Member"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full px-6 pt-4">
          {saveError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircleIcon className="size-3.5 shrink-0" />
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
              <CheckCircleIcon className="size-3.5 shrink-0" />
              {saveSuccess}
            </div>
          )}
          <div className="flex justify-end">
            {editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
                  Save
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => { setSaveError(""); setSaveSuccess(""); setEditing(true); }}>
                <PencilIcon className="size-4" />
                Edit
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2 p-6 max-w-5xl mx-auto w-full">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserIcon className="size-5" />
                User Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <MailIcon className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{dbUser?.email || "\u2014"}</p>
                </div>
              </div>
              <Separator />

              <div className="flex items-center gap-3">
                <UserIcon className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Name {editing && <span className="text-destructive">*</span>}</p>
                  {editing ? (
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="" className="text-sm mt-1" required />
                  ) : (
                    <p className="text-sm font-medium">{dbUser?.name || "\u2014"}</p>
                  )}
                </div>
              </div>
              <Separator />

              <div className="flex items-center gap-3">
                <PhoneIcon className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  {editing ? (
                    <PhoneInput value={editPhone} onChange={setEditPhone} placeholder="" className="text-sm mt-1" />
                  ) : (
                    <p className="text-sm font-medium">{dbUser?.phone || "\u2014"}</p>
                  )}
                </div>
              </div>
              <Separator />

              <div className="flex items-center gap-3">
                <Building2Icon className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Department</p>
                  {editing ? (
                    <Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} placeholder="" className="text-sm mt-1" />
                  ) : (
                    <p className="text-sm font-medium">{dbUser?.department || "\u2014"}</p>
                  )}
                </div>
              </div>
              <Separator />

              <div className="flex items-center gap-3">
                <Building2Icon className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Company</p>
                  {editing ? (
                    <Input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="" className="text-sm mt-1" />
                  ) : (
                    <p className="text-sm font-medium">{dbUser?.company || "\u2014"}</p>
                  )}
                </div>
              </div>
              <Separator />

              <div className="flex items-center gap-3">
                <ShieldIcon className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="text-sm font-medium capitalize">{dbUser?.role || "Member"}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <CircleIcon className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-sm font-medium capitalize">{dbUser?.status || "Offline"}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <CalendarIcon className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Member since</p>
                  <p className="text-sm font-medium">
                    {dbUser?.createdAt
                      ? new Date(dbUser.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                      : "\u2014"}
                  </p>
                </div>
              </div>
              <Separator />

              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Address</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Street</p>
                    {editing ? (
                      <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="" className="text-sm" />
                    ) : (
                      <p className="text-sm font-medium">{dbUser?.address || "\u2014"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">City</p>
                    {editing ? (
                      <LocationSelect options={pincodeResult?.cities || []} value={editCity} onChange={setEditCity} placeholder="" className="text-sm" />
                    ) : (
                      <p className="text-sm font-medium">{dbUser?.city || "\u2014"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">State</p>
                    {editing ? (
                      <LocationSelect options={pincodeResult?.states || []} value={editState} onChange={setEditState} placeholder="" className="text-sm" />
                    ) : (
                      <p className="text-sm font-medium">{dbUser?.state || "\u2014"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Country</p>
                    {editing ? (
                      <LocationSelect options={pincodeResult?.countries || []} value={editCountry} onChange={setEditCountry} placeholder="" className="text-sm" />
                    ) : (
                      <p className="text-sm font-medium">{dbUser?.country || "\u2014"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Zip / Postal Code</p>
                    {editing ? (
                      <PincodeInput value={editZipCode} onChange={setEditZipCode} onResult={setPincodeResult} className="text-sm" />
                    ) : (
                      <p className="text-sm font-medium">{dbUser?.zipCode || "\u2014"}</p>
                    )}
                  </div>
                </div>
              </div>
              <Separator />

              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Social Links</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">LinkedIn</p>
                    {editing ? (
                      <Input value={editLinkedin} onChange={(e) => setEditLinkedin(e.target.value)} placeholder="" className="text-sm" />
                    ) : (
                      <p className="text-sm font-medium truncate">{dbUser?.linkedin || "\u2014"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">GitHub</p>
                    {editing ? (
                      <Input value={editGithub} onChange={(e) => setEditGithub(e.target.value)} placeholder="" className="text-sm" />
                    ) : (
                      <p className="text-sm font-medium truncate">{dbUser?.github || "\u2014"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Twitter</p>
                    {editing ? (
                      <Input value={editTwitter} onChange={(e) => setEditTwitter(e.target.value)} placeholder="" className="text-sm" />
                    ) : (
                      <p className="text-sm font-medium truncate">{dbUser?.twitter || "\u2014"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Website</p>
                    {editing ? (
                      <Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} placeholder="" className="text-sm" />
                    ) : (
                      <p className="text-sm font-medium truncate">{dbUser?.website || "\u2014"}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2Icon className="size-5" />
                Company Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Company Name <span className="text-destructive">*</span></Label>
                      <Input value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} className="text-sm" placeholder="" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Business Type <span className="text-destructive">*</span></Label>
                      <Select value={editBusinessType} onValueChange={setEditBusinessType}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Proprietorship">Proprietorship</SelectItem>
                          <SelectItem value="Partnership">Partnership</SelectItem>
                          <SelectItem value="LLP">LLP</SelectItem>
                          <SelectItem value="Private Limited">Private Limited</SelectItem>
                          <SelectItem value="Public Limited">Public Limited</SelectItem>
                          <SelectItem value="OPC">OPC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <SearchableSelect
                        id="edit-industry"
                        label="Industry"
                        required
                        options={INDUSTRIES}
                        value={editIndustry}
                        onValueChange={setEditIndustry}
                        placeholder=""
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">GST Number</Label>
                      <Input value={editGstNumber} onChange={(e) => setEditGstNumber(e.target.value)} placeholder="" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">PAN Number</Label>
                      <Input value={editPanNumber} onChange={(e) => setEditPanNumber(e.target.value)} placeholder="" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">CIN Number</Label>
                      <Input value={editCinNumber} onChange={(e) => setEditCinNumber(e.target.value)} placeholder="" className="text-sm" />
                    </div>
                  </div>

                  <Separator />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Company Email <span className="text-destructive">*</span></Label>
                      <Input value={editCompanyEmail} onChange={(e) => setEditCompanyEmail(e.target.value)} type="email" placeholder="" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Mobile Number <span className="text-destructive">*</span></Label>
                      <PhoneInput value={editMobileNumber} onChange={setEditMobileNumber} placeholder="" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Alternate Mobile Number</Label>
                      <PhoneInput value={editAltMobile} onChange={setEditAltMobile} placeholder="" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Website</Label>
                      <Input value={editOrgWebsite} onChange={(e) => setEditOrgWebsite(e.target.value)} placeholder="" className="text-sm" />
                    </div>
                  </div>

                  <Separator />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Address</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-medium">Address Line 1 <span className="text-destructive">*</span></Label>
                      <Input value={editAddressLine1} onChange={(e) => setEditAddressLine1(e.target.value)} placeholder="" className="text-sm" />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-medium">Address Line 2</Label>
                      <Input value={editAddressLine2} onChange={(e) => setEditAddressLine2(e.target.value)} placeholder="" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">City <span className="text-destructive">*</span></Label>
                      <LocationSelect options={orgPincodeResult?.cities || []} value={editOrgCity} onChange={setEditOrgCity} placeholder="" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">State <span className="text-destructive">*</span></Label>
                      <LocationSelect options={orgPincodeResult?.states || []} value={editOrgState} onChange={setEditOrgState} placeholder="" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Pincode <span className="text-destructive">*</span></Label>
                      <PincodeInput value={editPincode} onChange={setEditPincode} onResult={setOrgPincodeResult} className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Country</Label>
                      <LocationSelect options={orgPincodeResult?.countries || []} value={editOrgCountry} onChange={setEditOrgCountry} placeholder="" className="text-sm" />
                    </div>
                  </div>

                  <Separator />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Authorized Person</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Authorized Person Name <span className="text-destructive">*</span></Label>
                      <Input value={editAuthorizedPerson} onChange={(e) => setEditAuthorizedPerson(e.target.value)} placeholder="" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Designation <span className="text-destructive">*</span></Label>
                      <Input value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} placeholder="" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Authorized Person Email <span className="text-destructive">*</span></Label>
                      <Input value={editAuthorizedEmail} onChange={(e) => setEditAuthorizedEmail(e.target.value)} type="email" placeholder="" className="text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Authorized Person Mobile <span className="text-destructive">*</span></Label>
                      <PhoneInput value={editAuthorizedMobile} onChange={setEditAuthorizedMobile} placeholder="" className="text-sm" />
                    </div>
                  </div>

                  <Separator />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Additional Information</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Number of Employees</Label>
                      <Input value={editNumEmployees} onChange={(e) => setEditNumEmployees(e.target.value)} type="number" min="0" placeholder="" className="text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Company Description</Label>
                    <Textarea value={editCompanyDesc} onChange={(e) => setEditCompanyDesc(e.target.value)} placeholder="" className="min-h-[80px] text-sm" />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Company Name</p>
                      <p className="text-sm font-medium">{org?.name || "\u2014"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Business Type</p>
                      <p className="text-sm font-medium">{org?.businessType || "\u2014"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Industry</p>
                      <p className="text-sm font-medium">{org?.industry || "\u2014"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">GST / PAN / CIN</p>
                      <p className="text-sm font-medium">{[org?.gstNumber, org?.panNumber, org?.cinNumber].filter(Boolean).join(" / ") || "\u2014"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Company Email</p>
                      <p className="text-sm font-medium">{org?.companyEmail || "\u2014"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mobile</p>
                      <p className="text-sm font-medium">{org?.mobileNumber || "\u2014"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Alternate Mobile</p>
                      <p className="text-sm font-medium">{org?.alternateMobileNumber || "\u2014"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Website</p>
                      <p className="text-sm font-medium">{org?.website || "\u2014"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-sm font-medium">
                        {[org?.addressLine1, org?.addressLine2, org?.city, org?.state, org?.pincode, org?.country].filter(Boolean).join(", ") || "\u2014"}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Authorized Person</p>
                      <p className="text-sm font-medium">{org?.authorizedPersonName || "\u2014"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Designation</p>
                      <p className="text-sm font-medium">{org?.designation || "\u2014"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Authorized Email</p>
                      <p className="text-sm font-medium">{org?.authorizedPersonEmail || "\u2014"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Authorized Mobile</p>
                      <p className="text-sm font-medium">{org?.authorizedPersonMobile || "\u2014"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Employees</p>
                      <p className="text-sm font-medium">{org?.numberOfEmployees || "\u2014"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="text-sm font-medium">{planLabels[org?.plan || "free"] || org?.plan}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm font-medium">{org?.companyDescription || "\u2014"}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showBannerEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowBannerEditor(false)}>
          <div className="w-full max-w-xs rounded-xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Update banner</h2>
              <button onClick={() => setShowBannerEditor(false)} className="rounded-md p-1 hover:bg-muted transition-colors">
                <XIcon className="size-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="text-xs" />
                <Button size="sm" className="text-xs shrink-0" disabled={!urlInput} onClick={() => updateBanner(urlInput)}>
                  Set
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <span className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </span>
              </div>

              <BannerUpload key={fileKey} onFile={handleBannerFile} disabled={uploading} />

              {bannerUrl && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <span className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or</span>
                    </span>
                  </div>
                  <Button variant="ghost" className="w-full text-xs text-destructive hover:text-destructive" onClick={() => updateBanner("")}>
                    Remove banner
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showImageEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImageEditor(false)}>
          <div className="w-full max-w-xs rounded-xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Update profile photo</h2>
              <button onClick={() => setShowImageEditor(false)} className="rounded-md p-1 hover:bg-muted transition-colors">
                <XIcon className="size-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <ProfileImageUpload key={imageFileKey} onFile={handleProfileImageFile} disabled={uploadingImage} />

              {profileImage && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <span className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or</span>
                    </span>
                  </div>
                  <Button variant="ghost" className="w-full text-xs text-destructive hover:text-destructive" onClick={removeProfileImage}>
                    Remove photo
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
