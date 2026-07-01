"use client";

import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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
  GlobeIcon,
  CreditCardIcon,
  UsersIcon,
  CircleIcon,
  CameraIcon,
  XIcon,
  Loader2Icon,
  UserIcon,
  PencilIcon,
  CheckIcon,
  LinkIcon,
  MapPinIcon,
  PhoneIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "lucide-react";

import nextDynamic from "next/dynamic";
const BannerUpload = nextDynamic(
  () => import("@/components/ui/file-upload-1").then((m) => m.BannerUpload),
  { ssr: false }
);
const ProfileImageUpload = nextDynamic(
  () => import("@/components/ui/profile-image-upload").then((m) => m.ProfileImageUpload),
  { ssr: false }
);

const planLabels: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const statusColors: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-1000",
  break: "bg-yellow-500",
};

const roleBadge: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  manager: "secondary",
  member: "outline",
};

type ProfileData = {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    company: string;
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    linkedin: string;
    github: string;
    twitter: string;
    website: string;
    status: string;
    role: string;
    createdAt: string;
    bannerUrl?: string;
    image?: string;
  } | null;
  org: {
    id: string;
    name: string;
    domain: string;
    businessType: string;
    industry: string;
    gstNumber: string;
    panNumber: string;
    cinNumber: string;
    companyEmail: string;
    mobileNumber: string;
    alternateMobileNumber: string;
    website: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    logoUrl: string;
    authorizedPersonName: string;
    designation: string;
    authorizedPersonEmail: string;
    authorizedPersonMobile: string;
    numberOfEmployees: number;
    companyDescription: string;
    plan: string;
    createdAt: string;
  } | null;
  memberCount: number;
};

type Props = {
  data: ProfileData;
};

export default function ProfileClient({ data }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const dbUser = data?.user;
  const org = data?.org;
  const memberCount = data?.memberCount ?? 0;

  // User fields — initialized from server-provided data
  const [editName, setEditName] = useState(dbUser?.name || "");
  const [editEmail, setEditEmail] = useState(dbUser?.email || "");
  const [editPhone, setEditPhone] = useState(dbUser?.phone || "");
  const [editDepartment, setEditDepartment] = useState(dbUser?.department || "");
  const [editCompany, setEditCompany] = useState(dbUser?.company || "");
  const [editAddress, setEditAddress] = useState(dbUser?.address || "");
  const [editCity, setEditCity] = useState(dbUser?.city || "");
  const [editState, setEditState] = useState(dbUser?.state || "");
  const [editCountry, setEditCountry] = useState(dbUser?.country || "");
  const [editZipCode, setEditZipCode] = useState(dbUser?.zipCode || "");
  const [editLinkedin, setEditLinkedin] = useState(dbUser?.linkedin || "");
  const [editGithub, setEditGithub] = useState(dbUser?.github || "");
  const [editTwitter, setEditTwitter] = useState(dbUser?.twitter || "");
  const [editWebsite, setEditWebsite] = useState(dbUser?.website || "");

  // Org fields — initialized from server-provided data
  const [editCompanyName, setEditCompanyName] = useState(org?.name || "");
  const [editDomain, setEditDomain] = useState(org?.domain || "");
  const [editBusinessType, setEditBusinessType] = useState(org?.businessType || "");
  const [editIndustry, setEditIndustry] = useState(org?.industry || "");
  const [editGstNumber, setEditGstNumber] = useState(org?.gstNumber || "");
  const [editPanNumber, setEditPanNumber] = useState(org?.panNumber || "");
  const [editCinNumber, setEditCinNumber] = useState(org?.cinNumber || "");
  const [editCompanyEmail, setEditCompanyEmail] = useState(org?.companyEmail || "");
  const [editMobileNumber, setEditMobileNumber] = useState(org?.mobileNumber || "");
  const [editAltMobile, setEditAltMobile] = useState(org?.alternateMobileNumber || "");
  const [editOrgWebsite, setEditOrgWebsite] = useState(org?.website || "");
  const [editAddressLine1, setEditAddressLine1] = useState(org?.addressLine1 || "");
  const [editAddressLine2, setEditAddressLine2] = useState(org?.addressLine2 || "");
  const [editOrgCity, setEditOrgCity] = useState(org?.city || "");
  const [editOrgState, setEditOrgState] = useState(org?.state || "");
  const [editPincode, setEditPincode] = useState(org?.pincode || "");
  const [editOrgCountry, setEditOrgCountry] = useState(org?.country || "India");
  const [editAuthorizedPerson, setEditAuthorizedPerson] = useState(org?.authorizedPersonName || "");
  const [editDesignation, setEditDesignation] = useState(org?.designation || "");
  const [editAuthorizedEmail, setEditAuthorizedEmail] = useState(org?.authorizedPersonEmail || "");
  const [editAuthorizedMobile, setEditAuthorizedMobile] = useState(org?.authorizedPersonMobile || "");
  const [editNumEmployees, setEditNumEmployees] = useState(org?.numberOfEmployees?.toString() || "");
  const [editCompanyDesc, setEditCompanyDesc] = useState(org?.companyDescription || "");

  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(dbUser?.bannerUrl || "");
  const [profileImage, setProfileImage] = useState(dbUser?.image || "");
  const [fileKey, setFileKey] = useState(0);
  const [imageFileKey, setImageFileKey] = useState(0);


  async function handleSave() {
    setSaveError("");
    setSaveSuccess("");

    // Client-side validation
    const errors: string[] = [];
    if (!editName.trim()) errors.push("Name is required");
    if (!editEmail.trim()) errors.push("Email is required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) errors.push("Invalid email format");
    if (editCompanyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editCompanyEmail)) errors.push("Invalid company email format");
    if (editNumEmployees && isNaN(Number(editNumEmployees))) errors.push("Number of employees must be a number");
    if (errors.length > 0) {
      setSaveError(errors.join("; "));
      return;
    }

    setSaving(true);
    try {
      console.log("[profile] saving profile...");
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          department: editDepartment,
          company: editCompany,
          address: editAddress,
          city: editCity,
          state: editState,
          country: editCountry,
          zipCode: editZipCode,
          linkedin: editLinkedin,
          github: editGithub,
          twitter: editTwitter,
          website: editWebsite,
          companyName: editCompanyName,
          companyDomain: editDomain,
          businessType: editBusinessType,
          industry: editIndustry,
          gstNumber: editGstNumber,
          panNumber: editPanNumber,
          cinNumber: editCinNumber,
          companyEmail: editCompanyEmail,
          mobileNumber: editMobileNumber,
          alternateMobileNumber: editAltMobile,
          orgWebsite: editOrgWebsite,
          addressLine1: editAddressLine1,
          addressLine2: editAddressLine2,
          orgCity: editOrgCity,
          orgState: editOrgState,
          pincode: editPincode,
          orgCountry: editOrgCountry,
          authorizedPersonName: editAuthorizedPerson,
          designation: editDesignation,
          authorizedPersonEmail: editAuthorizedEmail,
          authorizedPersonMobile: editAuthorizedMobile,
          numberOfEmployees: editNumEmployees ? Number(editNumEmployees) : undefined,
          companyDescription: editCompanyDesc,
        }),
      });

      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`;
        try { const err = await res.json(); errMsg = err.error || errMsg; } catch {}
        console.error("[profile] save failed:", errMsg);
        setSaveError(errMsg);
        return;
      }

      const result = await res.json();
      console.log("[profile] save success:", result);

      setSaveSuccess("Profile updated successfully");
      setEditing(false);
      // Clear success message after 4s
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (e) {
      console.error("[profile] save error:", e);
      setSaveError(e instanceof TypeError && e.message === "Failed to fetch"
        ? "Cannot connect to server. Please check your connection and try again."
        : (e instanceof Error ? e.message : "Network error"));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    // Reset all fields back to last fetched data
    setEditName(dbUser?.name || "");
    setEditEmail(dbUser?.email || "");
    setEditPhone(dbUser?.phone || "");
    setEditDepartment(dbUser?.department || "");
    setEditCompany(dbUser?.company || "");
    setEditAddress(dbUser?.address || "");
    setEditCity(dbUser?.city || "");
    setEditState(dbUser?.state || "");
    setEditCountry(dbUser?.country || "");
    setEditZipCode(dbUser?.zipCode || "");
    setEditLinkedin(dbUser?.linkedin || "");
    setEditGithub(dbUser?.github || "");
    setEditTwitter(dbUser?.twitter || "");
    setEditWebsite(dbUser?.website || "");
    setEditCompanyName(org?.name || "");
    setEditDomain(org?.domain || "");
    setEditBusinessType(org?.businessType || "");
    setEditIndustry(org?.industry || "");
    setEditGstNumber(org?.gstNumber || "");
    setEditPanNumber(org?.panNumber || "");
    setEditCinNumber(org?.cinNumber || "");
    setEditCompanyEmail(org?.companyEmail || "");
    setEditMobileNumber(org?.mobileNumber || "");
    setEditAltMobile(org?.alternateMobileNumber || "");
    setEditOrgWebsite(org?.website || "");
    setEditAddressLine1(org?.addressLine1 || "");
    setEditAddressLine2(org?.addressLine2 || "");
    setEditOrgCity(org?.city || "");
    setEditOrgState(org?.state || "");
    setEditPincode(org?.pincode || "");
    setEditOrgCountry(org?.country || "India");
    setEditAuthorizedPerson(org?.authorizedPersonName || "");
    setEditDesignation(org?.designation || "");
    setEditAuthorizedEmail(org?.authorizedPersonEmail || "");
    setEditAuthorizedMobile(org?.authorizedPersonMobile || "");
    setEditNumEmployees(org?.numberOfEmployees?.toString() || "");
    setEditCompanyDesc(org?.companyDescription || "");
    setSaveError("");
    setSaveSuccess("");
    setEditing(false);
  }

  async function updateBanner(url: string) {
    try {
      const res = await fetch("/api/user/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const result = await res.json();
        setBannerUrl(result.bannerUrl);
        setShowBannerEditor(false);
        setUrlInput("");
      } else {
        console.error("[profile] banner update failed:", await res.text());
      }
    } catch (e) {
      console.error("[profile] banner update error:", e);
    }
  }

  async function handleBannerFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert("Banner image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("banner", file);
      const res = await fetch("/api/user/banner", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        const result = await res.json();
        setBannerUrl(result.bannerUrl);
        setShowBannerEditor(false);
        setFileKey((k) => k + 1);
      } else {
        console.error("[profile] banner upload failed:", await res.text());
      }
    } catch (e) {
      console.error("[profile] banner upload error:", e);
    } finally {
      setUploading(false);
    }
  }

  async function removeProfileImage() {
    try {
      const res = await fetch("/api/user/profile-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image: "", url: "" }),
      });
      if (res.ok) {
        setProfileImage("");
        setShowImageEditor(false);
      } else {
        console.error("[profile] remove image failed:", await res.text());
      }
    } catch (e) {
      console.error("[profile] remove image error:", e);
    }
  }

  async function handleProfileImageFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert("Profile image must be under 5MB");
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/user/profile-image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        const result = await res.json();
        setProfileImage(result.image);
        setShowImageEditor(false);
        setImageFileKey((k) => k + 1);
      } else {
        console.error("[profile] image upload failed:", await res.text());
      }
    } catch (e) {
      console.error("[profile] image upload error:", e);
    } finally {
      setUploadingImage(false);
    }
  }

  return (
                                <>
                                <div className="flex flex-1 flex-col">
          <div
            className="relative h-[200px] bg-gradient-to-b from-primary/90 via-primary/40 to-background bg-cover bg-center"
            style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
          >
          </div>

          <div className="flex flex-col items-center -mt-12 px-6">
            <div className="relative group">
              <Avatar className="size-24 ring-4 ring-background shadow-xl">
                <AvatarImage src={dbUser?.image || ""} alt={dbUser?.name || ""} />
                <AvatarFallback className="text-2xl">{dbUser?.name?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => setShowImageEditor(true)}
                className="absolute -bottom-1 -right-1 flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
                aria-label="Edit profile photo"
              >
                <CameraIcon className="size-4" />
              </button>
            </div>

            <h1 className="mt-3 text-2xl font-bold">{dbUser?.name || "User"}</h1>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <span className="flex items-center gap-1.5 text-sm">
                <span className={`inline-block size-2 rounded-full ${statusColors[dbUser?.status || "offline"]}`} />
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
            {/* ─── User Details Card ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserIcon className="size-5" />
                  User Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Email (read-only — unique identifier) */}
                <div className="flex items-center gap-3">
                  <MailIcon className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{dbUser?.email || "—"}</p>
                  </div>
                </div>
                <Separator />

                {/* Name */}
                <div className="flex items-center gap-3">
                  <UserIcon className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Name {editing && <span className="text-d">*</span>}</p>
                    {editing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Full name"
                        className="h-8 text-sm mt-1"
                        required
                      />
                    ) : (
                      <p className="text-sm font-medium">{dbUser?.name || "—"}</p>
                    )}
                  </div>
                </div>
                <Separator />

                {/* Phone */}
                <div className="flex items-center gap-3">
                  <PhoneIcon className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    {editing ? (
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+1 555-123-4567"
                        className="h-8 text-sm mt-1"
                      />
                    ) : (
                      <p className="text-sm font-medium">{dbUser?.phone || "—"}</p>
                    )}
                  </div>
                </div>
                <Separator />

                {/* Department */}
                <div className="flex items-center gap-3">
                  <Building2Icon className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Department</p>
                    {editing ? (
                      <Input
                        value={editDepartment}
                        onChange={(e) => setEditDepartment(e.target.value)}
                        placeholder="Engineering"
                        className="h-8 text-sm mt-1"
                      />
                    ) : (
                      <p className="text-sm font-medium">{dbUser?.department || "—"}</p>
                    )}
                  </div>
                </div>
                <Separator />

                {/* Company (user-level) */}
                <div className="flex items-center gap-3">
                  <Building2Icon className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Company</p>
                    {editing ? (
                      <Input
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                        placeholder="Company name"
                        className="h-8 text-sm mt-1"
                      />
                    ) : (
                      <p className="text-sm font-medium">{dbUser?.company || "—"}</p>
                    )}
                  </div>
                </div>
                <Separator />

                {/* Role + Status (read-only) */}
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
                        ? new Date(dbUser.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
                <Separator />

                {/* Address fields */}
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Address</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Street</p>
                      {editing ? (
                        <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="123 Main St" className="h-8 text-sm" />
                      ) : (
                        <p className="text-sm font-medium">{dbUser?.address || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">City</p>
                      {editing ? (
                        <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Mumbai" className="h-8 text-sm" />
                      ) : (
                        <p className="text-sm font-medium">{dbUser?.city || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">State</p>
                      {editing ? (
                        <Input value={editState} onChange={(e) => setEditState(e.target.value)} placeholder="Maharashtra" className="h-8 text-sm" />
                      ) : (
                        <p className="text-sm font-medium">{dbUser?.state || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Country</p>
                      {editing ? (
                        <Input value={editCountry} onChange={(e) => setEditCountry(e.target.value)} placeholder="India" className="h-8 text-sm" />
                      ) : (
                        <p className="text-sm font-medium">{dbUser?.country || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Zip / Postal Code</p>
                      {editing ? (
                        <Input value={editZipCode} onChange={(e) => setEditZipCode(e.target.value)} placeholder="400001" className="h-8 text-sm" />
                      ) : (
                        <p className="text-sm font-medium">{dbUser?.zipCode || "—"}</p>
                      )}
                    </div>
                  </div>
                </div>
                <Separator />

                {/* Social Links */}
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Social Links</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">LinkedIn</p>
                      {editing ? (
                        <Input
                          value={editLinkedin}
                          onChange={(e) => setEditLinkedin(e.target.value)}
                          placeholder="https://linkedin.com/in/username"
                          className="h-8 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium truncate">{dbUser?.linkedin || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">GitHub</p>
                      {editing ? (
                        <Input
                          value={editGithub}
                          onChange={(e) => setEditGithub(e.target.value)}
                          placeholder="https://github.com/username"
                          className="h-8 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium truncate">{dbUser?.github || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Twitter</p>
                      {editing ? (
                        <Input
                          value={editTwitter}
                          onChange={(e) => setEditTwitter(e.target.value)}
                          placeholder="https://twitter.com/username"
                          className="h-8 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium truncate">{dbUser?.twitter || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Website</p>
                      {editing ? (
                        <Input
                          value={editWebsite}
                          onChange={(e) => setEditWebsite(e.target.value)}
                          placeholder="https://example.com"
                          className="h-8 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium truncate">{dbUser?.website || "—"}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ─── Company Details Card ─── */}
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
                        <Input value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} className="h-9 text-sm" placeholder="Acme Corp" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Business Type <span className="text-destructive">*</span></Label>
                        <Select value={editBusinessType} onValueChange={setEditBusinessType}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select business type" />
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
                          placeholder="Select industry"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">GST Number</Label>
                        <Input value={editGstNumber} onChange={(e) => setEditGstNumber(e.target.value)} placeholder="22AAAAA0000A1Z5" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">PAN Number</Label>
                        <Input value={editPanNumber} onChange={(e) => setEditPanNumber(e.target.value)} placeholder="ABCDE1234F" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">CIN Number</Label>
                        <Input value={editCinNumber} onChange={(e) => setEditCinNumber(e.target.value)} placeholder="L12345MH2020PLC123456" className="h-9 text-sm" />
                      </div>
                    </div>

                    <Separator />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Company Email <span className="text-destructive">*</span></Label>
                        <Input value={editCompanyEmail} onChange={(e) => setEditCompanyEmail(e.target.value)} type="email" placeholder="company@example.com" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Mobile Number <span className="text-destructive">*</span></Label>
                        <Input value={editMobileNumber} onChange={(e) => setEditMobileNumber(e.target.value)} placeholder="+91 9876543210" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Alternate Mobile Number</Label>
                        <Input value={editAltMobile} onChange={(e) => setEditAltMobile(e.target.value)} placeholder="+91 9876543211" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Website</Label>
                        <Input value={editOrgWebsite} onChange={(e) => setEditOrgWebsite(e.target.value)} placeholder="https://company.com" className="h-9 text-sm" />
                      </div>
                    </div>

                    <Separator />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Address</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium">Address Line 1 <span className="text-destructive">*</span></Label>
                        <Input value={editAddressLine1} onChange={(e) => setEditAddressLine1(e.target.value)} placeholder="123 Main Street" className="h-9 text-sm" />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium">Address Line 2</Label>
                        <Input value={editAddressLine2} onChange={(e) => setEditAddressLine2(e.target.value)} placeholder="Suite 100" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">City <span className="text-destructive">*</span></Label>
                        <Input value={editOrgCity} onChange={(e) => setEditOrgCity(e.target.value)} placeholder="Mumbai" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">State <span className="text-destructive">*</span></Label>
                        <Input value={editOrgState} onChange={(e) => setEditOrgState(e.target.value)} placeholder="Maharashtra" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Pincode <span className="text-destructive">*</span></Label>
                        <Input value={editPincode} onChange={(e) => setEditPincode(e.target.value)} placeholder="400001" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Country</Label>
                        <Input value={editOrgCountry} onChange={(e) => setEditOrgCountry(e.target.value)} placeholder="India" className="h-9 text-sm" />
                      </div>
                    </div>

                    <Separator />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Authorized Person</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Authorized Person Name <span className="text-destructive">*</span></Label>
                        <Input value={editAuthorizedPerson} onChange={(e) => setEditAuthorizedPerson(e.target.value)} placeholder="John Doe" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Designation <span className="text-destructive">*</span></Label>
                        <Input value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} placeholder="CEO" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Authorized Person Email <span className="text-destructive">*</span></Label>
                        <Input value={editAuthorizedEmail} onChange={(e) => setEditAuthorizedEmail(e.target.value)} type="email" placeholder="john@company.com" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Authorized Person Mobile <span className="text-destructive">*</span></Label>
                        <Input value={editAuthorizedMobile} onChange={(e) => setEditAuthorizedMobile(e.target.value)} placeholder="+91 9876543210" className="h-9 text-sm" />
                      </div>
                    </div>

                    <Separator />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Additional Information</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Number of Employees</Label>
                        <Input value={editNumEmployees} onChange={(e) => setEditNumEmployees(e.target.value)} type="number" min="0" placeholder="50" className="h-9 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Company Description</Label>
                      <Textarea value={editCompanyDesc} onChange={(e) => setEditCompanyDesc(e.target.value)} placeholder="Describe your company..." className="min-h-[80px] text-sm" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Company Name</p>
                        <p className="text-sm font-medium">{org?.name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Business Type</p>
                        <p className="text-sm font-medium">{org?.businessType || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Industry</p>
                        <p className="text-sm font-medium">{org?.industry || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">GST / PAN / CIN</p>
                        <p className="text-sm font-medium">{[org?.gstNumber, org?.panNumber, org?.cinNumber].filter(Boolean).join(" / ") || "—"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Company Email</p>
                        <p className="text-sm font-medium">{org?.companyEmail || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Mobile</p>
                        <p className="text-sm font-medium">{org?.mobileNumber || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Alternate Mobile</p>
                        <p className="text-sm font-medium">{org?.alternateMobileNumber || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Website</p>
                        <p className="text-sm font-medium">{org?.website || "—"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm font-medium">
                          {[org?.addressLine1, org?.addressLine2, org?.city, org?.state, org?.pincode, org?.country].filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Authorized Person</p>
                        <p className="text-sm font-medium">{org?.authorizedPersonName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Designation</p>
                        <p className="text-sm font-medium">{org?.designation || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Authorized Email</p>
                        <p className="text-sm font-medium">{org?.authorizedPersonEmail || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Authorized Mobile</p>
                        <p className="text-sm font-medium">{org?.authorizedPersonMobile || "—"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Employees</p>
                        <p className="text-sm font-medium">{org?.numberOfEmployees || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Plan</p>
                        <p className="text-sm font-medium">{planLabels[org?.plan || "free"] || org?.plan}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Description</p>
                        <p className="text-sm font-medium">{org?.companyDescription || "—"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Banner editor modal */}
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
                    placeholder="Paste image URL"
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

        {/* Profile image editor modal */}
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
        </>
      );
}
