"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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
import { INDUSTRIES } from "@/lib/industries";
import { StorageChart } from "@/components/storage-chart";
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
  HardDrive,
  MapPinIcon,
  LinkIcon,
} from "lucide-react";
import Link from "next/link";
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
  starter: "Free",
  pro: "Pro",
  growth: "Growth",
  enterprise: "Enterprise",
};

const statusColors: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  break: "bg-yellow-500",
};

const roleBadge: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  manager: "secondary",
  member: "outline",
};

const TABS = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "company", label: "Company", icon: Building2Icon },
  { id: "storage", label: "Storage", icon: HardDrive },
] as const;

type TabId = (typeof TABS)[number]["id"];

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

type ProfilePageInteractiveProps = {
  data: ProfileData;
};

export function ProfilePageInteractive({ data: initialData }: ProfilePageInteractiveProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<ProfileData>(initialData);
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const [imageFileKey, setImageFileKey] = useState(0);

  const [bannerUrl, setBannerUrl] = useState(initialData?.user?.bannerUrl || "");
  const [profileImage, setProfileImage] = useState(initialData?.user?.image || "");
  const [editName, setEditName] = useState(initialData?.user?.name || "");
  const [editEmail, setEditEmail] = useState(initialData?.user?.email || "");
  const [editPhone, setEditPhone] = useState(initialData?.user?.phone || "");
  const [editDepartment, setEditDepartment] = useState(initialData?.user?.department || "");
  const [editCompany, setEditCompany] = useState(initialData?.user?.company || "");
  const [editAddress, setEditAddress] = useState(initialData?.user?.address || "");
  const [editCity, setEditCity] = useState(initialData?.user?.city || "");
  const [editState, setEditState] = useState(initialData?.user?.state || "");
  const [editCountry, setEditCountry] = useState(initialData?.user?.country || "");
  const [editZipCode, setEditZipCode] = useState(initialData?.user?.zipCode || "");
  const [editLinkedin, setEditLinkedin] = useState(initialData?.user?.linkedin || "");
  const [editGithub, setEditGithub] = useState(initialData?.user?.github || "");
  const [editTwitter, setEditTwitter] = useState(initialData?.user?.twitter || "");
  const [editWebsite, setEditWebsite] = useState(initialData?.user?.website || "");
  const [editCompanyName, setEditCompanyName] = useState(initialData?.org?.name || "");
  const [editDomain, setEditDomain] = useState(initialData?.org?.domain || "");
  const [editBusinessType, setEditBusinessType] = useState(initialData?.org?.businessType || "");
  const [editIndustry, setEditIndustry] = useState(initialData?.org?.industry || "");
  const [editGstNumber, setEditGstNumber] = useState(initialData?.org?.gstNumber || "");
  const [editPanNumber, setEditPanNumber] = useState(initialData?.org?.panNumber || "");
  const [editCinNumber, setEditCinNumber] = useState(initialData?.org?.cinNumber || "");
  const [editCompanyEmail, setEditCompanyEmail] = useState(initialData?.org?.companyEmail || "");
  const [editMobileNumber, setEditMobileNumber] = useState(initialData?.org?.mobileNumber || "");
  const [editAltMobile, setEditAltMobile] = useState(initialData?.org?.alternateMobileNumber || "");
  const [editOrgWebsite, setEditOrgWebsite] = useState(initialData?.org?.website || "");
  const [editAddressLine1, setEditAddressLine1] = useState(initialData?.org?.addressLine1 || "");
  const [editAddressLine2, setEditAddressLine2] = useState(initialData?.org?.addressLine2 || "");
  const [editOrgCity, setEditOrgCity] = useState(initialData?.org?.city || "");
  const [editOrgState, setEditOrgState] = useState(initialData?.org?.state || "");
  const [editPincode, setEditPincode] = useState(initialData?.org?.pincode || "");
  const [editOrgCountry, setEditOrgCountry] = useState(initialData?.org?.country || "India");
  const [editAuthorizedPerson, setEditAuthorizedPerson] = useState(initialData?.org?.authorizedPersonName || "");
  const [editDesignation, setEditDesignation] = useState(initialData?.org?.designation || "");
  const [editAuthorizedEmail, setEditAuthorizedEmail] = useState(initialData?.org?.authorizedPersonEmail || "");
  const [editAuthorizedMobile, setEditAuthorizedMobile] = useState(initialData?.org?.authorizedPersonMobile || "");
  const [editNumEmployees, setEditNumEmployees] = useState(initialData?.org?.numberOfEmployees?.toString() || "");
  const [editCompanyDesc, setEditCompanyDesc] = useState(initialData?.org?.companyDescription || "");

  const dbUser = data?.user;
  const org = data?.org;
  const memberCount = data?.memberCount ?? 0;

  const displayName = session?.user?.name || dbUser?.name || "User";
  const displayEmail = session?.user?.email || dbUser?.email || "user@example.com";
  const displayAvatar = profileImage || session?.user?.image || dbUser?.image || "";

  async function handleSave() {
    setSaveError("");
    setSaveSuccess("");

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
      setTimeout(() => setSaveSuccess(""), 4000);
      window.location.reload();
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
      <div
        className="relative h-[200px] bg-gradient-to-b from-primary/90 via-primary/40 to-background bg-cover bg-center"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
      >
        <button
          onClick={() => setShowBannerEditor(true)}
          className="absolute top-4 right-4 flex items-center gap-1.5 rounded-lg bg-background/80 backdrop-blur-sm px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-background/95 transition-colors"
          aria-label="Edit banner"
        >
          <CameraIcon className="size-3.5" />
          Change banner
        </button>
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

        <h1 className="mt-3 text-2xl font-bold">{displayName}</h1>
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

      <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full px-6 pt-4">
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

      <div className="grid gap-6 xl:grid-cols-2 p-6 max-w-5xl mx-auto w-full">
        <Card>
          <CardHeader>
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
                  <p className="text-sm font-medium">{dbUser?.name || "—"}</p>
                )}
              </div>
            </div>
            <Separator />
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
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
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
                  <p className="text-xs text-muted-foreground mb-1">Zip Code</p>
                  {editing ? (
                    <Input value={editZipCode} onChange={(e) => setEditZipCode(e.target.value)} placeholder="400001" className="h-8 text-sm" />
                  ) : (
                    <p className="text-sm font-medium">{dbUser?.zipCode || "—"}</p>
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
                      placeholder="https://linkedin.com/in/username"
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium truncate">{dbUser?.linkedin || "—"}</p>
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
                      placeholder="https://github.com/username"
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium truncate">{dbUser?.github || "—"}</p>
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
                      placeholder="https://twitter.com/username"
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium truncate">{dbUser?.twitter || "—"}</p>
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
      </div>

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
