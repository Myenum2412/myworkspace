"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  BriefcaseIcon,
  HistoryIcon,
  GraduationCapIcon,
  HeartIcon,
  FileTextIcon,
  UploadIcon,
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

type ExperienceRow = {
  id?: string;
  company?: string;
  title?: string;
  roles?: string;
  from?: string;
  to?: string;
  description?: string;
  relevant?: boolean;
};

type EducationRow = {
  id?: string;
  institute?: string;
  degree?: string;
  specialization?: string;
  completionDate?: string;
};

type DependentRow = {
  id?: string;
  name?: string;
  relationship?: string;
  dob?: string;
};

type ProfileData = {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    secondaryPhone: string;
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
    displayId: string;
    firstName: string;
    lastName: string;
    nickname: string;
    location: string;
    designation: string;
    employmentType: string;
    branchName: string;
    shift: string;
    sourceOfHire: string;
    joiningDate: string;
    currentExperience: string;
    totalExperience: string;
    workExperience: ExperienceRow[];
    educationDetails: EducationRow[];
    dependentDetails: DependentRow[];
    offerLetter: string;
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
  const [editDisplayId, setEditDisplayId] = useState(dbUser?.displayId || "");
  const [editFirstName, setEditFirstName] = useState(dbUser?.firstName || "");
  const [editLastName, setEditLastName] = useState(dbUser?.lastName || "");
  const [editNickname, setEditNickname] = useState(dbUser?.nickname || "");
  const [editEmpDesignation, setEditEmpDesignation] = useState(dbUser?.designation || "");
  const [editEmploymentType, setEditEmploymentType] = useState(dbUser?.employmentType || "");
  const [editBranchName, setEditBranchName] = useState(dbUser?.branchName || "");
  const [editShift, setEditShift] = useState(dbUser?.shift || "");
  const [editSourceOfHire, setEditSourceOfHire] = useState(dbUser?.sourceOfHire || "");
  const [editJoiningDate, setEditJoiningDate] = useState(dbUser?.joiningDate || "");
  const [editCurrentExperience, setEditCurrentExperience] = useState(dbUser?.currentExperience || "");
  const [editTotalExperience, setEditTotalExperience] = useState(dbUser?.totalExperience || "");
  const [editSecondaryPhone, setEditSecondaryPhone] = useState(dbUser?.secondaryPhone || "");
  const [editUserLocation, setEditUserLocation] = useState(dbUser?.location || "");
  const [editWorkExperience, setEditWorkExperience] = useState<ExperienceRow[]>(
    (dbUser?.workExperience && dbUser.workExperience.length > 0) ? dbUser.workExperience : []
  );
  const [editEducationDetails, setEditEducationDetails] = useState<EducationRow[]>(
    (dbUser?.educationDetails && dbUser.educationDetails.length > 0) ? dbUser.educationDetails : []
  );
  const [editDependentDetails, setEditDependentDetails] = useState<DependentRow[]>(
    (dbUser?.dependentDetails && dbUser.dependentDetails.length > 0) ? dbUser.dependentDetails : []
  );
  const [editOfferLetter, setEditOfferLetter] = useState<{ name: string; data: string } | null>(null);
  const [offerLetterUploading, setOfferLetterUploading] = useState(false);

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

  function generateId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  const updateWorkRow = (id: string, field: string, value: string | boolean) => {
    setEditWorkExperience((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const updateEduRow = (id: string, field: string, value: string) => {
    setEditEducationDetails((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const updateDepRow = (id: string, field: string, value: string) => {
    setEditDependentDetails((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = (type: "work" | "education" | "dependent") => {
    const id = generateId();
    if (type === "work") {
      setEditWorkExperience((prev) => [...prev, { id, company: "", title: "", roles: "", from: "", to: "", description: "", relevant: false }]);
    } else if (type === "education") {
      setEditEducationDetails((prev) => [...prev, { id, institute: "", degree: "", specialization: "", completionDate: "" }]);
    } else {
      setEditDependentDetails((prev) => [...prev, { id, name: "", relationship: "", dob: "" }]);
    }
  };

  const removeRow = (type: "work" | "education" | "dependent", id: string) => {
    if (type === "work") {
      setEditWorkExperience((prev) => prev.filter((r) => r.id !== id));
    } else if (type === "education") {
      setEditEducationDetails((prev) => prev.filter((r) => r.id !== id));
    } else {
      setEditDependentDetails((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleOfferLetterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Offer letter must be under 10MB");
      return;
    }
    setOfferLetterUploading(true);
    try {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      setEditOfferLetter({ name: file.name, data: `data:${file.type};base64,${base64}` });
    } catch {
      toast.error("Failed to read file");
    } finally {
      setOfferLetterUploading(false);
    }
  };

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
          displayId: editDisplayId,
          firstName: editFirstName,
          lastName: editLastName,
          nickname: editNickname,
          empDesignation: editEmpDesignation,
          employmentType: editEmploymentType,
          branchName: editBranchName,
          shift: editShift,
          sourceOfHire: editSourceOfHire,
          joiningDate: editJoiningDate,
          currentExperience: editCurrentExperience,
          totalExperience: editTotalExperience,
          secondaryPhone: editSecondaryPhone,
          location: editUserLocation,
          workExperience: editWorkExperience,
          educationDetails: editEducationDetails,
          dependentDetails: editDependentDetails,
          offerLetter: editOfferLetter?.data || null,
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
        toast.error(errMsg);
        setSaveError(errMsg);
        return;
      }

      const result = await res.json();
      toast.success("Profile updated successfully");
      setSaveSuccess("Profile updated successfully");
      setEditing(false);
      // Clear success message after 4s
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (e) {
      const errMsg = e instanceof TypeError && e.message === "Failed to fetch"
        ? "Cannot connect to server. Please check your connection and try again."
        : (e instanceof Error ? e.message : "Network error");
      toast.error(errMsg);
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
    setEditDisplayId(dbUser?.displayId || "");
    setEditFirstName(dbUser?.firstName || "");
    setEditLastName(dbUser?.lastName || "");
    setEditNickname(dbUser?.nickname || "");
    setEditEmpDesignation(dbUser?.designation || "");
    setEditEmploymentType(dbUser?.employmentType || "");
    setEditBranchName(dbUser?.branchName || "");
    setEditShift(dbUser?.shift || "");
    setEditSourceOfHire(dbUser?.sourceOfHire || "");
    setEditJoiningDate(dbUser?.joiningDate || "");
    setEditCurrentExperience(dbUser?.currentExperience || "");
    setEditTotalExperience(dbUser?.totalExperience || "");
    setEditSecondaryPhone(dbUser?.secondaryPhone || "");
    setEditUserLocation(dbUser?.location || "");
    setEditWorkExperience((dbUser?.workExperience && dbUser.workExperience.length > 0) ? dbUser.workExperience : []);
    setEditEducationDetails((dbUser?.educationDetails && dbUser.educationDetails.length > 0) ? dbUser.educationDetails : []);
    setEditDependentDetails((dbUser?.dependentDetails && dbUser.dependentDetails.length > 0) ? dbUser.dependentDetails : []);
    setEditOfferLetter(null);
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
        toast.error("Failed to update banner");
      }
    } catch (e) {
      toast.error("Failed to update banner");
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
        toast.error("Failed to upload banner");
      }
    } catch (e) {
      toast.error("Failed to upload banner");
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
        toast.error("Failed to remove profile image");
      }
    } catch (e) {
      toast.error("Failed to remove profile image");
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
        toast.error("Failed to upload profile image");
      }
    } catch (e) {
      toast.error("Failed to upload profile image");
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

          <div className="grid gap-6 p-6 max-w-5xl mx-auto w-full">
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

            {/* ─── Employee Details Card ─── */}
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BriefcaseIcon className="size-5" />
                  Employee Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {editing ? (
                  <div className="space-y-6">
                    {/* Work Info */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                        <BriefcaseIcon className="size-3.5" />
                        Work Info
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Employee ID</Label>
                          <Input value={editDisplayId} onChange={(e) => setEditDisplayId(e.target.value)} className="h-9 text-sm" placeholder="EMP-001" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Designation</Label>
                          <Input value={editEmpDesignation} onChange={(e) => setEditEmpDesignation(e.target.value)} className="h-9 text-sm" placeholder="Senior Developer" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Employment Type</Label>
                          <Input value={editEmploymentType} onChange={(e) => setEditEmploymentType(e.target.value)} className="h-9 text-sm" placeholder="Full-time" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Branch</Label>
                          <Input value={editBranchName} onChange={(e) => setEditBranchName(e.target.value)} className="h-9 text-sm" placeholder="Main Branch" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Location</Label>
                          <Input value={editUserLocation} onChange={(e) => setEditUserLocation(e.target.value)} className="h-9 text-sm" placeholder="New York" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Shift</Label>
                          <Input value={editShift} onChange={(e) => setEditShift(e.target.value)} className="h-9 text-sm" placeholder="Day" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Source of Hire</Label>
                          <Input value={editSourceOfHire} onChange={(e) => setEditSourceOfHire(e.target.value)} className="h-9 text-sm" placeholder="Referral" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Joining Date</Label>
                          <Input type="date" value={editJoiningDate} onChange={(e) => setEditJoiningDate(e.target.value)} className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Current Experience</Label>
                          <Input value={editCurrentExperience} onChange={(e) => setEditCurrentExperience(e.target.value)} className="h-9 text-sm" placeholder="3 years" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Total Experience</Label>
                          <Input value={editTotalExperience} onChange={(e) => setEditTotalExperience(e.target.value)} className="h-9 text-sm" placeholder="5 years" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Personal Info */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                        <UserIcon className="size-3.5" />
                        Personal Info
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">First Name</Label>
                          <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="h-9 text-sm" placeholder="John" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Last Name</Label>
                          <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="h-9 text-sm" placeholder="Doe" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Nickname</Label>
                          <Input value={editNickname} onChange={(e) => setEditNickname(e.target.value)} className="h-9 text-sm" placeholder="Johnny" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Contact */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                        <PhoneIcon className="size-3.5" />
                        Contact
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Alternate Phone</Label>
                          <Input value={editSecondaryPhone} onChange={(e) => setEditSecondaryPhone(e.target.value)} className="h-9 text-sm" placeholder="+1 555-987-6543" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* History - Work Experience */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                        <HistoryIcon className="size-3.5" />
                        Work Experience
                      </h3>
                      <div className="space-y-4">
                        {editWorkExperience.map((row) => (
                          <div key={row.id} className="rounded-lg border p-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Company name</Label>
                                <Input value={row.company || ""} onChange={(e) => updateWorkRow(row.id!, "company", e.target.value)} className="h-9 text-sm" placeholder="Company name" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Job Title</Label>
                                <Input value={row.title || ""} onChange={(e) => updateWorkRow(row.id!, "title", e.target.value)} className="h-9 text-sm" placeholder="Job Title" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Roles</Label>
                                <Input value={row.roles || ""} onChange={(e) => updateWorkRow(row.id!, "roles", e.target.value)} className="h-9 text-sm" placeholder="e.g. Developer, Team Lead" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">From Date</Label>
                                <Input type="date" value={row.from || ""} onChange={(e) => updateWorkRow(row.id!, "from", e.target.value)} className="h-9 text-sm" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">To Date</Label>
                                <Input type="date" value={row.to || ""} onChange={(e) => updateWorkRow(row.id!, "to", e.target.value)} className="h-9 text-sm" />
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox id={`work-relevant-${row.id}`} checked={!!row.relevant} onCheckedChange={(c) => updateWorkRow(row.id!, "relevant", !!c)} />
                                <label htmlFor={`work-relevant-${row.id}`} className="text-sm font-medium">Relevant</label>
                              </div>
                              <div className="sm:col-span-2 space-y-1.5">
                                <Label className="text-xs font-medium">Job Description</Label>
                                <textarea className="min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring" value={row.description || ""} onChange={(e) => updateWorkRow(row.id!, "description", e.target.value)} placeholder="Job Description" />
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="mt-2 text-destructive" onClick={() => removeRow("work", row.id!)}>
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => addRow("work")}>
                          + Add Work Experience
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* History - Education */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                        <GraduationCapIcon className="size-3.5" />
                        Education
                      </h3>
                      <div className="space-y-4">
                        {editEducationDetails.map((row) => (
                          <div key={row.id} className="rounded-lg border p-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Institute Name</Label>
                                <Input value={row.institute || ""} onChange={(e) => updateEduRow(row.id!, "institute", e.target.value)} className="h-9 text-sm" placeholder="Institute Name" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Degree/Diploma</Label>
                                <Input value={row.degree || ""} onChange={(e) => updateEduRow(row.id!, "degree", e.target.value)} className="h-9 text-sm" placeholder="Degree/Diploma" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Specialization</Label>
                                <Input value={row.specialization || ""} onChange={(e) => updateEduRow(row.id!, "specialization", e.target.value)} className="h-9 text-sm" placeholder="Specialization" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Date of Completion</Label>
                                <Input type="date" value={row.completionDate || ""} onChange={(e) => updateEduRow(row.id!, "completionDate", e.target.value)} className="h-9 text-sm" />
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="mt-2 text-destructive" onClick={() => removeRow("education", row.id!)}>
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => addRow("education")}>
                          + Add Education
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* History - Dependents */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                        <HeartIcon className="size-3.5" />
                        Dependents
                      </h3>
                      <div className="space-y-4">
                        {editDependentDetails.map((row) => (
                          <div key={row.id} className="rounded-lg border p-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Name</Label>
                                <Input value={row.name || ""} onChange={(e) => updateDepRow(row.id!, "name", e.target.value)} className="h-9 text-sm" placeholder="Name" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Relationship</Label>
                                <Input value={row.relationship || ""} onChange={(e) => updateDepRow(row.id!, "relationship", e.target.value)} className="h-9 text-sm" placeholder="Spouse, Child, Parent" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Date of Birth</Label>
                                <Input type="date" value={row.dob || ""} onChange={(e) => updateDepRow(row.id!, "dob", e.target.value)} className="h-9 text-sm" />
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="mt-2 text-destructive" onClick={() => removeRow("dependent", row.id!)}>
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => addRow("dependent")}>
                          + Add Dependent
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Offer Letter */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                        <FileTextIcon className="size-3.5" />
                        Documents
                      </h3>
                      {editOfferLetter ? (
                        <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/20">
                          <FileTextIcon className="size-5 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate flex-1">{editOfferLetter.name}</span>
                          <button type="button" onClick={() => setEditOfferLetter(null)} className="text-destructive hover:text-destructive/80">
                            <XIcon className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-3 rounded-lg border border-dashed p-4 cursor-pointer hover:bg-muted/20 transition-colors">
                          <UploadIcon className="size-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {offerLetterUploading ? "Uploading..." : "Upload offer letter (PDF, max 10MB)"}
                          </span>
                          <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleOfferLetterUpload} disabled={offerLetterUploading} />
                        </label>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Work Info */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                        <BriefcaseIcon className="size-3.5" />
                        Work Info
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Employee ID</p>
                          <p className="text-sm font-medium">{dbUser?.displayId || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Designation</p>
                          <p className="text-sm font-medium">{dbUser?.designation || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Employment Type</p>
                          <p className="text-sm font-medium">{dbUser?.employmentType || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Branch</p>
                          <p className="text-sm font-medium">{dbUser?.branchName || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Location</p>
                          <p className="text-sm font-medium">{dbUser?.location || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Shift</p>
                          <p className="text-sm font-medium">{dbUser?.shift || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Source of Hire</p>
                          <p className="text-sm font-medium">{dbUser?.sourceOfHire || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Joining Date</p>
                          <p className="text-sm font-medium">
                            {dbUser?.joiningDate
                              ? new Date(dbUser.joiningDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Current Experience</p>
                          <p className="text-sm font-medium">{dbUser?.currentExperience || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Experience</p>
                          <p className="text-sm font-medium">{dbUser?.totalExperience || "—"}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Personal Info */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                        <UserIcon className="size-3.5" />
                        Personal Info
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">First Name</p>
                          <p className="text-sm font-medium">{dbUser?.firstName || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Name</p>
                          <p className="text-sm font-medium">{dbUser?.lastName || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Nickname</p>
                          <p className="text-sm font-medium">{dbUser?.nickname || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Alternate Phone</p>
                          <p className="text-sm font-medium">{dbUser?.secondaryPhone || "—"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Work Experience History */}
                    {dbUser?.workExperience && dbUser.workExperience.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                            <HistoryIcon className="size-3.5" />
                            Work Experience
                          </h3>
                          <div className="space-y-4">
                            {dbUser.workExperience.map((exp, i) => (
                              <div key={exp.id || i} className="rounded-lg border p-4">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Company</p>
                                    <p className="text-sm font-medium">{exp.company || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Job Title</p>
                                    <p className="text-sm font-medium">{exp.title || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Roles</p>
                                    <p className="text-sm font-medium">{exp.roles || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Period</p>
                                    <p className="text-sm font-medium">
                                      {exp.from ? new Date(exp.from).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}
                                      {" — "}
                                      {exp.to ? new Date(exp.to).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "Present"}
                                    </p>
                                  </div>
                                  {exp.description && (
                                    <div className="sm:col-span-2 lg:col-span-3">
                                      <p className="text-xs text-muted-foreground">Description</p>
                                      <p className="text-sm">{exp.description}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs text-muted-foreground">Relevant</p>
                                    <p className="text-sm font-medium">{exp.relevant ? "Yes" : "No"}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Education */}
                    {dbUser?.educationDetails && dbUser.educationDetails.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                            <GraduationCapIcon className="size-3.5" />
                            Education
                          </h3>
                          <div className="space-y-4">
                            {dbUser.educationDetails.map((edu, i) => (
                              <div key={edu.id || i} className="rounded-lg border p-4">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Institute</p>
                                    <p className="text-sm font-medium">{edu.institute || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Degree / Diploma</p>
                                    <p className="text-sm font-medium">{edu.degree || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Specialization</p>
                                    <p className="text-sm font-medium">{edu.specialization || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Completion Date</p>
                                    <p className="text-sm font-medium">
                                      {edu.completionDate
                                        ? new Date(edu.completionDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
                                        : "—"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Dependents */}
                    {dbUser?.dependentDetails && dbUser.dependentDetails.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                            <HeartIcon className="size-3.5" />
                            Dependents
                          </h3>
                          <div className="space-y-4">
                            {dbUser.dependentDetails.map((dep, i) => (
                              <div key={dep.id || i} className="rounded-lg border p-4">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Name</p>
                                    <p className="text-sm font-medium">{dep.name || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Relationship</p>
                                    <p className="text-sm font-medium">{dep.relationship || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                                    <p className="text-sm font-medium">
                                      {dep.dob
                                        ? new Date(dep.dob).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                                        : "—"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
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
