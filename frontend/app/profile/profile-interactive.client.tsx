"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PincodeInput, LocationSelect } from "@/components/ui/location-fields";
import { INDUSTRIES } from "@/lib/industries";
import { StorageDashboard } from "@/components/storage-dashboard";
import { WhatsAppStats } from "@/components/whatsapp-stats";
import {
  MailIcon,
  CalendarIcon,
  ShieldIcon,
  Building2Icon,
  GlobeIcon,
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
  HardDrive as HardDriveIcon,
  MapPinIcon,
  LinkIcon,
  FileTextIcon,
  ClockIcon,
  BadgeCheckIcon,
  FileCheckIcon,
  UploadIcon,
  LandmarkIcon,
  BriefcaseIcon,
} from "lucide-react";
import nextDynamic from "next/dynamic";
import { useProfileForm, statusColors, roleBadge } from "@/hooks/use-profile-form";
import type { ProfileData } from "@/hooks/use-profile-form";

const BannerUpload = nextDynamic(
  () => import("@/components/ui/file-upload-1").then((m) => m.BannerUpload),
  { ssr: false }
);
const ProfileImageUpload = nextDynamic(
  () => import("@/components/ui/profile-image-upload").then((m) => m.ProfileImageUpload),
  { ssr: false }
);

const TABS = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "company", label: "Company", icon: Building2Icon },
  { id: "storage", label: "Storage", icon: HardDriveIcon },
  { id: "terms", label: "Terms", icon: FileTextIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

type ProfilePageInteractiveProps = {
  data: ProfileData;
};

export function ProfilePageInteractive({ data: initialData }: ProfilePageInteractiveProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const form = useProfileForm(initialData);

  const {
    data, editing, setEditing, saving, saveError, saveSuccess,
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
    editTradeName, setEditTradeName, editYearEstablished, setEditYearEstablished,
    editCompanySize, setEditCompanySize, editRegistrationNumber, setEditRegistrationNumber,
    editRegistrationAuthority, setEditRegistrationAuthority, editTaxId, setEditTaxId,
    editRegistrationDate, setEditRegistrationDate, editBusinessStatus, setEditBusinessStatus,
    editSupportEmail, setEditSupportEmail, editSupportPhone, setEditSupportPhone,
    editFacebook, setEditFacebook, editInstagram, setEditInstagram,
    editTwitterHandle, setEditTwitterHandle, editYoutube, setEditYoutube,
    editPrimaryActivity, setEditPrimaryActivity, editSecondaryActivity, setEditSecondaryActivity,
    editOperatingCountries, setEditOperatingCountries, editTimeZone, setEditTimeZone,
    editCurrency, setEditCurrency,
    showBannerEditor, setShowBannerEditor, showImageEditor, setShowImageEditor,
    urlInput, setUrlInput, uploading, uploadingImage, fileKey, imageFileKey,
    dbUser, org,
    handleSave, handleCancel, updateBanner, handleBannerFile,
    removeProfileImage, handleProfileImageFile,
  } = form;

  const [pincodeResult, setPincodeResult] = useState<{cities: string[]; states: string[]; countries: string[]} | null>(null);
  const [orgPincodeResult, setOrgPincodeResult] = useState<{cities: string[]; states: string[]; countries: string[]} | null>(null);

  const displayName = session?.user?.name || dbUser?.name || "User";
  const displayEmail = session?.user?.email || dbUser?.email || "user@example.com";
  const displayAvatar = profileImage || session?.user?.image || dbUser?.image || "";

  return (
    <div className="-m-4 w-[calc(100%+32px)] h-[calc(100%+32px)] flex flex-col">
      <div
        className="relative h-[200px] shrink-0 bg-gradient-to-b from-primary/90 via-primary/40 to-background bg-cover bg-center"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
      >
      </div>

      <div className="flex flex-col items-center -mt-12 px-6">
        <div className="relative group">
          <Avatar className="size-24 ring-4 ring-background shadow-xl">
            <AvatarImage src={displayAvatar} alt={displayName} />
            <AvatarFallback className="text-2xl">{displayName.charAt(0).toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => setShowImageEditor(true)}
            className="absolute -bottom-1 -right-1 flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
            aria-label="Edit profile photo"
          >
            <CameraIcon className="size-4" />
          </button>
        </div>

        <h1 className="mt-3 text-xl sm:text-2xl font-bold">{displayName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{displayEmail}</p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="default">
            <ShieldIcon className="size-3 mr-1" />
            {dbUser?.role ? dbUser.role.charAt(0).toUpperCase() + dbUser.role.slice(1) : "Admin"}
          </Badge>
          {org?.name && (
            <Badge variant="secondary">
              <Building2Icon className="size-3 mr-1" />
              {org.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full px-6 pt-4 shrink-0">
        {saveError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{saveError}</div>
        )}
        {saveSuccess && (
          <div className="rounded-md bg-green-500/10 px-3 py-2 text-xs text-green-600">{saveSuccess}</div>
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
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <PencilIcon className="size-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b pb-1 overflow-x-auto w-full px-6 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-background border border-b-0 border-border text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="flex-1 grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 xl:grid-cols-2 p-3 sm:p-4 md:p-6 w-full min-w-0 max-w-full overflow-auto">
          <Card className="rounded-none">
            <CardHeader className="rounded-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserIcon className="size-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <MailIcon className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{displayEmail}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <UserIcon className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  {editing ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm mt-1"
                    />
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
                    <PhoneInput value={editPhone} onChange={setEditPhone} placeholder="" className="h-8 text-sm mt-1" />
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
                    <Input
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      placeholder=""
                      className="h-8 text-sm mt-1"
                    />
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
                    <Input
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      placeholder=""
                      className="h-8 text-sm mt-1"
                    />
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
                  <p className="text-sm font-medium capitalize">{dbUser?.role || "Admin"}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <CalendarIcon className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Member since</p>
                  <p className="text-sm font-medium">
                    {dbUser?.createdAt
                      ? new Date(dbUser.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "\u2014"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none">
            <CardHeader className="rounded-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPinIcon className="size-5" />
                Address & Social
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Address</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
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
                    <p className="text-xs text-muted-foreground mb-1">Zip Code</p>
                    {editing ? (
                      <PincodeInput value={editZipCode} onChange={setEditZipCode} onResult={setPincodeResult} className="text-sm" />
                    ) : (
                      <p className="text-sm font-medium">{dbUser?.zipCode || "\u2014"}</p>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Social Links</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <LinkIcon className="size-3" /> LinkedIn
                    </p>
                    {editing ? (
                      <Input
                        value={editLinkedin}
                        onChange={(e) => setEditLinkedin(e.target.value)}
                        placeholder=""
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{dbUser?.linkedin || "\u2014"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <LinkIcon className="size-3" /> GitHub
                    </p>
                    {editing ? (
                      <Input
                        value={editGithub}
                        onChange={(e) => setEditGithub(e.target.value)}
                        placeholder=""
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{dbUser?.github || "\u2014"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <LinkIcon className="size-3" /> Twitter
                    </p>
                    {editing ? (
                      <Input
                        value={editTwitter}
                        onChange={(e) => setEditTwitter(e.target.value)}
                        placeholder=""
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{dbUser?.twitter || "\u2014"}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <GlobeIcon className="size-3" /> Website
                    </p>
                    {editing ? (
                      <Input
                        value={editWebsite}
                        onChange={(e) => setEditWebsite(e.target.value)}
                        placeholder=""
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{dbUser?.website || "\u2014"}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "company" && (
        <div className="flex-1 p-3 sm:p-4 md:p-6 w-full min-w-0 max-w-full overflow-auto space-y-6">
          {/* Basic Information */}
          <Card className="rounded-none">
            <CardHeader className="rounded-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2Icon className="size-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Legal Company Name <span className="text-destructive">*</span></Label>
                    <Input value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} className="text-sm" placeholder="" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Trade Name / Brand Name</Label>
                    <Input value={editTradeName} onChange={(e) => setEditTradeName(e.target.value)} className="text-sm" placeholder="" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Business Type <span className="text-destructive">*</span></Label>
                    <Select value={editBusinessType} onValueChange={setEditBusinessType}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                        <SelectItem value="Partnership">Partnership</SelectItem>
                        <SelectItem value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</SelectItem>
                        <SelectItem value="Private Company">Private Company</SelectItem>
                        <SelectItem value="Public Company">Public Company</SelectItem>
                        <SelectItem value="Corporation">Corporation</SelectItem>
                        <SelectItem value="Limited Liability Company (LLC)">Limited Liability Company (LLC)</SelectItem>
                        <SelectItem value="Non-Profit Organization">Non-Profit Organization</SelectItem>
                        <SelectItem value="Government Organization">Government Organization</SelectItem>
                        <SelectItem value="Educational Institution">Educational Institution</SelectItem>
                        <SelectItem value="Trust">Trust</SelectItem>
                        <SelectItem value="Cooperative">Cooperative</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
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
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium">Company Description</Label>
                    <Textarea value={editCompanyDesc} onChange={(e) => setEditCompanyDesc(e.target.value)} placeholder="" className="min-h-[80px] text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Year Established</Label>
                    <Input value={editYearEstablished} onChange={(e) => setEditYearEstablished(e.target.value)} placeholder="e.g. 2020" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Company Size</Label>
                    <Select value={editCompanySize} onValueChange={setEditCompanySize}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10</SelectItem>
                        <SelectItem value="11-50">11-50</SelectItem>
                        <SelectItem value="51-200">51-200</SelectItem>
                        <SelectItem value="201-500">201-500</SelectItem>
                        <SelectItem value="501-1000">501-1000</SelectItem>
                        <SelectItem value="1000+">1000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Number of Employees</Label>
                    <Input value={editNumEmployees} onChange={(e) => setEditNumEmployees(e.target.value)} type="number" min="0" placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Website</Label>
                    <Input value={editOrgWebsite} onChange={(e) => setEditOrgWebsite(e.target.value)} placeholder="https://" className="text-sm" />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Company Name</p>
                    <p className="text-sm font-medium">{org?.name || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trade Name</p>
                    <p className="text-sm font-medium">{org?.tradeName || "\u2014"}</p>
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
                    <p className="text-xs text-muted-foreground">Year Established</p>
                    <p className="text-sm font-medium">{org?.yearEstablished || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Company Size</p>
                    <p className="text-sm font-medium">{org?.companySize || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Employees</p>
                    <p className="text-sm font-medium">{org?.numberOfEmployees || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    <p className="text-sm font-medium">{org?.website || "\u2014"}</p>
                  </div>
                  {org?.companyDescription && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm font-medium mt-1">{org.companyDescription}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Registration Information */}
          <Card className="rounded-none">
            <CardHeader className="rounded-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <LandmarkIcon className="size-5" />
                Registration Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Country <span className="text-destructive">*</span></Label>
                    <LocationSelect options={orgPincodeResult?.countries || []} value={editOrgCountry} onChange={setEditOrgCountry} placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Business Registration Number <span className="text-destructive">*</span></Label>
                    <Input value={editRegistrationNumber} onChange={(e) => setEditRegistrationNumber(e.target.value)} placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Registration Authority</Label>
                    <Input value={editRegistrationAuthority} onChange={(e) => setEditRegistrationAuthority(e.target.value)} placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Tax Identification Number (Optional)</Label>
                    <Input value={editTaxId} onChange={(e) => setEditTaxId(e.target.value)} placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Registration Date</Label>
                    <Input value={editRegistrationDate} onChange={(e) => setEditRegistrationDate(e.target.value)} type="date" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Business Status</Label>
                    <Select value={editBusinessStatus} onValueChange={setEditBusinessStatus}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Suspended">Suspended</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
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
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Country</p>
                    <p className="text-sm font-medium">{org?.country || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Registration Number</p>
                    <p className="text-sm font-medium">{org?.registrationNumber || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Registration Authority</p>
                    <p className="text-sm font-medium">{org?.registrationAuthority || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tax ID Number</p>
                    <p className="text-sm font-medium">{org?.taxIdentificationNumber || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Registration Date</p>
                    <p className="text-sm font-medium">{org?.registrationDate || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Business Status</p>
                    <p className="text-sm font-medium">{org?.businessStatus || "Active"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">GST / PAN / CIN</p>
                    <p className="text-sm font-medium">{[org?.gstNumber, org?.panNumber, org?.cinNumber].filter(Boolean).join(" / ") || "\u2014"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="rounded-none">
            <CardHeader className="rounded-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <PhoneIcon className="size-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Official Email <span className="text-destructive">*</span></Label>
                    <Input value={editCompanyEmail} onChange={(e) => setEditCompanyEmail(e.target.value)} type="email" placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Phone Number <span className="text-destructive">*</span></Label>
                    <PhoneInput value={editMobileNumber} onChange={setEditMobileNumber} placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Alternate Phone</Label>
                    <PhoneInput value={editAltMobile} onChange={setEditAltMobile} placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Support Email</Label>
                    <Input value={editSupportEmail} onChange={(e) => setEditSupportEmail(e.target.value)} type="email" placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Support Phone</Label>
                    <PhoneInput value={editSupportPhone} onChange={setEditSupportPhone} placeholder="" className="text-sm" />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Official Email</p>
                    <p className="text-sm font-medium">{org?.companyEmail || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{org?.mobileNumber || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Alternate Phone</p>
                    <p className="text-sm font-medium">{org?.alternateMobileNumber || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Support Email</p>
                    <p className="text-sm font-medium">{org?.supportEmail || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Support Phone</p>
                    <p className="text-sm font-medium">{org?.supportPhone || "\u2014"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="rounded-none">
            <CardHeader className="rounded-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPinIcon className="size-5" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium">Registered Address Line 1 <span className="text-destructive">*</span></Label>
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
                    <Label className="text-xs font-medium">State / Province / Region <span className="text-destructive">*</span></Label>
                    <LocationSelect options={orgPincodeResult?.states || []} value={editOrgState} onChange={setEditOrgState} placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Postal / ZIP Code <span className="text-destructive">*</span></Label>
                    <PincodeInput value={editPincode} onChange={setEditPincode} onResult={setOrgPincodeResult} className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Country <span className="text-destructive">*</span></Label>
                    <LocationSelect options={orgPincodeResult?.countries || []} value={editOrgCountry} onChange={setEditOrgCountry} placeholder="" className="text-sm" />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">
                      {[org?.addressLine1, org?.addressLine2, org?.city, org?.state, org?.pincode, org?.country].filter(Boolean).join(", ") || "\u2014"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Authorized Representative */}
          <Card className="rounded-none">
            <CardHeader className="rounded-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserIcon className="size-5" />
                Authorized Representative
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Full Name <span className="text-destructive">*</span></Label>
                    <Input value={editAuthorizedPerson} onChange={(e) => setEditAuthorizedPerson(e.target.value)} placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Designation <span className="text-destructive">*</span></Label>
                    <Input value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Email <span className="text-destructive">*</span></Label>
                    <Input value={editAuthorizedEmail} onChange={(e) => setEditAuthorizedEmail(e.target.value)} type="email" placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Phone Number <span className="text-destructive">*</span></Label>
                    <PhoneInput value={editAuthorizedMobile} onChange={setEditAuthorizedMobile} placeholder="" className="text-sm" />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="text-sm font-medium">{org?.authorizedPersonName || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Designation</p>
                    <p className="text-sm font-medium">{org?.designation || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{org?.authorizedPersonEmail || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{org?.authorizedPersonMobile || "\u2014"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Details */}
          <Card className="rounded-none">
            <CardHeader className="rounded-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <BriefcaseIcon className="size-5" />
                Business Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Primary Business Activity</Label>
                    <Input value={editPrimaryActivity} onChange={(e) => setEditPrimaryActivity(e.target.value)} placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Secondary Business Activity</Label>
                    <Input value={editSecondaryActivity} onChange={(e) => setEditSecondaryActivity(e.target.value)} placeholder="" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Operating Countries</Label>
                    <Input value={editOperatingCountries} onChange={(e) => setEditOperatingCountries(e.target.value)} placeholder="e.g. India, USA, UK" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Time Zone</Label>
                    <Input value={editTimeZone} onChange={(e) => setEditTimeZone(e.target.value)} placeholder="e.g. UTC+5:30" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Preferred Currency</Label>
                    <Select value={editCurrency} onValueChange={setEditCurrency}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                        <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                        <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                        <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Primary Business Activity</p>
                    <p className="text-sm font-medium">{org?.primaryBusinessActivity || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Secondary Business Activity</p>
                    <p className="text-sm font-medium">{org?.secondaryBusinessActivity || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Operating Countries</p>
                    <p className="text-sm font-medium">{org?.operatingCountries || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Time Zone</p>
                    <p className="text-sm font-medium">{org?.timeZone || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Preferred Currency</p>
                    <p className="text-sm font-medium">{org?.preferredCurrency || "\u2014"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social & Online Presence */}
          <Card className="rounded-none">
            <CardHeader className="rounded-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <GlobeIcon className="size-5" />
                Social & Online Presence
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Website</Label>
                    <Input value={editOrgWebsite} onChange={(e) => setEditOrgWebsite(e.target.value)} placeholder="https://" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">LinkedIn</Label>
                    <Input value={editLinkedin} onChange={(e) => setEditLinkedin(e.target.value)} placeholder="https://linkedin.com/company/..." className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Facebook</Label>
                    <Input value={editFacebook} onChange={(e) => setEditFacebook(e.target.value)} placeholder="https://facebook.com/..." className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Instagram</Label>
                    <Input value={editInstagram} onChange={(e) => setEditInstagram(e.target.value)} placeholder="https://instagram.com/..." className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">X (Twitter)</Label>
                    <Input value={editTwitterHandle} onChange={(e) => setEditTwitterHandle(e.target.value)} placeholder="https://x.com/..." className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">YouTube</Label>
                    <Input value={editYoutube} onChange={(e) => setEditYoutube(e.target.value)} placeholder="https://youtube.com/..." className="text-sm" />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    <p className="text-sm font-medium">{org?.website || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">LinkedIn</p>
                    <p className="text-sm font-medium truncate">{org?.authorizedPersonEmail ? dbUser?.linkedin || "\u2014" : "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Facebook</p>
                    <p className="text-sm font-medium truncate">{org?.facebook || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Instagram</p>
                    <p className="text-sm font-medium truncate">{org?.instagram || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">X (Twitter)</p>
                    <p className="text-sm font-medium truncate">{org?.twitterHandle || "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">YouTube</p>
                    <p className="text-sm font-medium truncate">{org?.youtube || "\u2014"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card className="rounded-none">
            <CardHeader className="rounded-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <BadgeCheckIcon className="size-5" />
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Email Verified", verified: org?.emailVerified },
                  { label: "Phone Verified", verified: org?.phoneVerified },
                  { label: "Website Verified", verified: org?.websiteVerified },
                  { label: "Business Verified", verified: org?.businessVerified },
                  { label: "Address Verified", verified: org?.addressVerified },
                  { label: "Documents Verified", verified: org?.documentsVerified },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 border p-3">
                    {item.verified ? (
                      <CheckCircleIcon className="size-5 text-green-500 shrink-0" />
                    ) : (
                      <ClockIcon className="size-5 text-yellow-500 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.verified ? "Verified" : "Pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="rounded-none">
            <CardHeader className="rounded-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheckIcon className="size-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Business Registration Certificate", required: true },
                  { label: "Tax Certificate", required: false },
                  { label: "Address Proof", required: true },
                  { label: "Company Logo", required: false },
                  { label: "Additional Documents", required: false },
                ].map((doc) => (
                  <div key={doc.label} className="flex items-center justify-between border p-3">
                    <div className="flex items-center gap-3">
                      <FileTextIcon className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          {doc.label}
                          {doc.required && <span className="text-destructive ml-1">*</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.required ? "Required" : "Optional"}
                        </p>
                      </div>
                    </div>
                    {editing && (
                      <Button size="sm" variant="outline" className="text-xs">
                        <UploadIcon className="size-3 mr-1" />
                        Upload
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "storage" && (
        <div className="flex-1 p-3 sm:p-4 md:p-6 w-full min-w-0 max-w-full overflow-auto space-y-6">
          <StorageDashboard orgId={initialData.org?.id || ""} />
          <WhatsAppStats />
        </div>
      )}

      {activeTab === "terms" && (
        <div className="flex-1 p-3 sm:p-4 md:p-6 w-full min-w-0 max-w-full overflow-auto">
          <Card className="rounded-none">
            <CardHeader className="rounded-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileTextIcon className="size-5" />
                Terms & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <p>
                  Welcome to MyWorkSpace. By accessing or using our platform, you agree to be bound by these Terms & Conditions.
                </p>

                <h4 className="text-sm font-semibold text-foreground mt-6 mb-2">1. Acceptance of Terms</h4>
                <p className="text-sm">
                  By creating an account and using MyWorkSpace, you acknowledge that you have read, understood, and agree to be bound by these terms. If you do not agree, please do not use the service.
                </p>

                <h4 className="text-sm font-semibold text-foreground mt-6 mb-2">2. User Responsibilities</h4>
                <p className="text-sm">
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.
                </p>

                <h4 className="text-sm font-semibold text-foreground mt-6 mb-2">3. Data Privacy</h4>
                <p className="text-sm">
                  We take your privacy seriously. All data stored on our platform is encrypted and handled in accordance with our Privacy Policy. We do not share your personal information with third parties without your explicit consent.
                </p>

                <h4 className="text-sm font-semibold text-foreground mt-6 mb-2">4. Usage Limits</h4>
                <p className="text-sm">
                  Your access to the platform is subject to the plan you have subscribed to. Exceeding usage limits may result in service restrictions or additional charges.
                </p>

                <h4 className="text-sm font-semibold text-foreground mt-6 mb-2">5. Intellectual Property</h4>
                <p className="text-sm">
                  All content, features, and functionality of MyWorkSpace are owned by us and are protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without permission.
                </p>

                <h4 className="text-sm font-semibold text-foreground mt-6 mb-2">6. Limitation of Liability</h4>
                <p className="text-sm">
                  MyWorkSpace shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the platform.
                </p>

                <h4 className="text-sm font-semibold text-foreground mt-6 mb-2">7. Termination</h4>
                <p className="text-sm">
                  We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our discretion.
                </p>

                <h4 className="text-sm font-semibold text-foreground mt-6 mb-2">8. Changes to Terms</h4>
                <p className="text-sm">
                  We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms.
                </p>

                <div className="pt-4 border-t mt-6">
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    For questions about these terms, please contact{" "}
                    <a href="mailto:support@myworkspace.io" className="text-primary hover:underline">support@myworkspace.io</a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showBannerEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowBannerEditor(false)}>
          <div className="w-full max-w-xs rounded-xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Update banner</h2>
              <button
                onClick={() => setShowBannerEditor(false)}
                className="rounded-md p-1 hover:bg-muted transition-colors"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder=""
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  disabled={!urlInput}
                  onClick={() => updateBanner(urlInput)}
                >
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
              <BannerUpload
                key={fileKey}
                onFile={handleBannerFile}
                disabled={uploading}
              />
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
                  <Button
                    variant="ghost"
                    className="w-full h-8 text-xs text-destructive hover:text-destructive"
                    onClick={() => updateBanner("")}
                  >
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
              <button
                onClick={() => setShowImageEditor(false)}
                className="rounded-md p-1 hover:bg-muted transition-colors"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              <ProfileImageUpload
                key={imageFileKey}
                onFile={handleProfileImageFile}
                disabled={uploadingImage}
              />
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
                  <Button
                    variant="ghost"
                    className="w-full h-8 text-xs text-destructive hover:text-destructive"
                    onClick={removeProfileImage}
                  >
                    Remove photo
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
