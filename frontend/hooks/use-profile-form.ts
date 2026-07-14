"use client";

import { useState, useCallback, useRef } from "react";

export type ProfileData = {
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
    // Extended fields
    tradeName: string;
    yearEstablished: string;
    companySize: string;
    registrationNumber: string;
    registrationAuthority: string;
    taxIdentificationNumber: string;
    registrationDate: string;
    businessStatus: string;
    supportEmail: string;
    supportPhone: string;
    facebook: string;
    instagram: string;
    twitterHandle: string;
    youtube: string;
    primaryBusinessActivity: string;
    secondaryBusinessActivity: string;
    operatingCountries: string;
    timeZone: string;
    preferredCurrency: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    websiteVerified: boolean;
    businessVerified: boolean;
    addressVerified: boolean;
    documentsVerified: boolean;
  } | null;
  memberCount: number;
};

export const planLabels: Record<string, string> = {
  starter: "Free",
  pro: "Pro",
  growth: "Growth",
  enterprise: "Enterprise",
};

export const statusColors: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  break: "bg-yellow-500",
};

export const roleBadge: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  manager: "secondary",
  member: "outline",
};

export function useProfileForm(initialData: ProfileData) {
  const [data, setData] = useState<ProfileData>(initialData);
  const savedDataRef = useRef<ProfileData>(initialData);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

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
  // Extended fields
  const [editTradeName, setEditTradeName] = useState(initialData?.org?.tradeName || "");
  const [editYearEstablished, setEditYearEstablished] = useState(initialData?.org?.yearEstablished || "");
  const [editCompanySize, setEditCompanySize] = useState(initialData?.org?.companySize || "");
  const [editRegistrationNumber, setEditRegistrationNumber] = useState(initialData?.org?.registrationNumber || "");
  const [editRegistrationAuthority, setEditRegistrationAuthority] = useState(initialData?.org?.registrationAuthority || "");
  const [editTaxId, setEditTaxId] = useState(initialData?.org?.taxIdentificationNumber || "");
  const [editRegistrationDate, setEditRegistrationDate] = useState(initialData?.org?.registrationDate || "");
  const [editBusinessStatus, setEditBusinessStatus] = useState(initialData?.org?.businessStatus || "Active");
  const [editSupportEmail, setEditSupportEmail] = useState(initialData?.org?.supportEmail || "");
  const [editSupportPhone, setEditSupportPhone] = useState(initialData?.org?.supportPhone || "");
  const [editFacebook, setEditFacebook] = useState(initialData?.org?.facebook || "");
  const [editInstagram, setEditInstagram] = useState(initialData?.org?.instagram || "");
  const [editTwitterHandle, setEditTwitterHandle] = useState(initialData?.org?.twitterHandle || "");
  const [editYoutube, setEditYoutube] = useState(initialData?.org?.youtube || "");
  const [editPrimaryActivity, setEditPrimaryActivity] = useState(initialData?.org?.primaryBusinessActivity || "");
  const [editSecondaryActivity, setEditSecondaryActivity] = useState(initialData?.org?.secondaryBusinessActivity || "");
  const [editOperatingCountries, setEditOperatingCountries] = useState(initialData?.org?.operatingCountries || "");
  const [editTimeZone, setEditTimeZone] = useState(initialData?.org?.timeZone || "");
  const [editCurrency, setEditCurrency] = useState(initialData?.org?.preferredCurrency || "");

  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const [imageFileKey, setImageFileKey] = useState(0);

  const dbUser = data?.user;
  const org = data?.org;

  const handleSave = useCallback(async () => {
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
          tradeName: editTradeName,
          yearEstablished: editYearEstablished,
          companySize: editCompanySize,
          registrationNumber: editRegistrationNumber,
          registrationAuthority: editRegistrationAuthority,
          taxIdentificationNumber: editTaxId,
          registrationDate: editRegistrationDate,
          businessStatus: editBusinessStatus,
          supportEmail: editSupportEmail,
          supportPhone: editSupportPhone,
          facebook: editFacebook,
          instagram: editInstagram,
          twitterHandle: editTwitterHandle,
          youtube: editYoutube,
          primaryBusinessActivity: editPrimaryActivity,
          secondaryBusinessActivity: editSecondaryActivity,
          operatingCountries: editOperatingCountries,
          timeZone: editTimeZone,
          preferredCurrency: editCurrency,
        }),
      });

      if (!res.ok) {
        let errMsg = "Request failed (" + res.status + ")";
        try { const err = await res.json(); errMsg = err.error || errMsg; } catch {}
        setSaveError(errMsg);
        return;
      }

      const result = await res.json();
      setSaveSuccess("Profile updated successfully");
      setEditing(false);
      setTimeout(() => setSaveSuccess(""), 4000);

      if (result.user || result.org) {
        setData((prev) => {
          const merged = {
            ...prev,
            user: result.user ? { ...prev.user, ...result.user } : prev.user,
            org: result.org ? { ...prev.org, ...result.org } : prev.org,
          };
          savedDataRef.current = merged;
          return merged;
        });
      }
    } catch (e) {
      setSaveError(e instanceof TypeError && e.message === "Failed to fetch"
        ? "Cannot connect to server. Please check your connection and try again."
        : (e instanceof Error ? e.message : "Network error"));
    } finally {
      setSaving(false);
    }
  }, [
    editName, editEmail, editPhone, editDepartment, editCompany,
    editAddress, editCity, editState, editCountry, editZipCode,
    editLinkedin, editGithub, editTwitter, editWebsite,
    editCompanyName, editDomain, editBusinessType, editIndustry,
    editGstNumber, editPanNumber, editCinNumber, editCompanyEmail,
    editMobileNumber, editAltMobile, editOrgWebsite,
    editAddressLine1, editAddressLine2, editOrgCity, editOrgState,
    editPincode, editOrgCountry, editAuthorizedPerson, editDesignation,
    editAuthorizedEmail, editAuthorizedMobile, editNumEmployees, editCompanyDesc,
  ]);

  const handleCancel = useCallback(() => {
    const snapUser = savedDataRef.current?.user;
    const snapOrg = savedDataRef.current?.org;
    setEditName(snapUser?.name || "");
    setEditEmail(snapUser?.email || "");
    setEditPhone(snapUser?.phone || "");
    setEditDepartment(snapUser?.department || "");
    setEditCompany(snapUser?.company || "");
    setEditAddress(snapUser?.address || "");
    setEditCity(snapUser?.city || "");
    setEditState(snapUser?.state || "");
    setEditCountry(snapUser?.country || "");
    setEditZipCode(snapUser?.zipCode || "");
    setEditLinkedin(snapUser?.linkedin || "");
    setEditGithub(snapUser?.github || "");
    setEditTwitter(snapUser?.twitter || "");
    setEditWebsite(snapUser?.website || "");
    setEditCompanyName(snapOrg?.name || "");
    setEditDomain(snapOrg?.domain || "");
    setEditBusinessType(snapOrg?.businessType || "");
    setEditIndustry(snapOrg?.industry || "");
    setEditGstNumber(snapOrg?.gstNumber || "");
    setEditPanNumber(snapOrg?.panNumber || "");
    setEditCinNumber(snapOrg?.cinNumber || "");
    setEditCompanyEmail(snapOrg?.companyEmail || "");
    setEditMobileNumber(snapOrg?.mobileNumber || "");
    setEditAltMobile(snapOrg?.alternateMobileNumber || "");
    setEditOrgWebsite(snapOrg?.website || "");
    setEditAddressLine1(snapOrg?.addressLine1 || "");
    setEditAddressLine2(snapOrg?.addressLine2 || "");
    setEditOrgCity(snapOrg?.city || "");
    setEditOrgState(snapOrg?.state || "");
    setEditPincode(snapOrg?.pincode || "");
    setEditOrgCountry(snapOrg?.country || "India");
    setEditAuthorizedPerson(snapOrg?.authorizedPersonName || "");
    setEditDesignation(snapOrg?.designation || "");
    setEditAuthorizedEmail(snapOrg?.authorizedPersonEmail || "");
    setEditAuthorizedMobile(snapOrg?.authorizedPersonMobile || "");
    setEditNumEmployees(snapOrg?.numberOfEmployees?.toString() || "");
    setEditCompanyDesc(snapOrg?.companyDescription || "");
    setEditTradeName(snapOrg?.tradeName || "");
    setEditYearEstablished(snapOrg?.yearEstablished || "");
    setEditCompanySize(snapOrg?.companySize || "");
    setEditRegistrationNumber(snapOrg?.registrationNumber || "");
    setEditRegistrationAuthority(snapOrg?.registrationAuthority || "");
    setEditTaxId(snapOrg?.taxIdentificationNumber || "");
    setEditRegistrationDate(snapOrg?.registrationDate || "");
    setEditBusinessStatus(snapOrg?.businessStatus || "Active");
    setEditSupportEmail(snapOrg?.supportEmail || "");
    setEditSupportPhone(snapOrg?.supportPhone || "");
    setEditFacebook(snapOrg?.facebook || "");
    setEditInstagram(snapOrg?.instagram || "");
    setEditTwitterHandle(snapOrg?.twitterHandle || "");
    setEditYoutube(snapOrg?.youtube || "");
    setEditPrimaryActivity(snapOrg?.primaryBusinessActivity || "");
    setEditSecondaryActivity(snapOrg?.secondaryBusinessActivity || "");
    setEditOperatingCountries(snapOrg?.operatingCountries || "");
    setEditTimeZone(snapOrg?.timeZone || "");
    setEditCurrency(snapOrg?.preferredCurrency || "");
    setSaveError("");
    setSaveSuccess("");
    setEditing(false);
  }, []);

  const updateBanner = useCallback(async (url: string) => {
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
      }
    } catch {
      setSaveError("Failed to update banner");
    }
  }, []);

  const handleBannerFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Banner image must be under 5MB");
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
      }
    } catch {
      setSaveError("Failed to upload banner");
    } finally {
      setUploading(false);
    }
  }, []);

  const removeProfileImage = useCallback(async () => {
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
      }
    } catch {
      setSaveError("Failed to remove profile image");
    }
  }, []);

  const handleProfileImageFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Profile image must be under 5MB");
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
      }
    } catch {
      setSaveError("Failed to upload profile image");
    } finally {
      setUploadingImage(false);
    }
  }, []);

  return {
    data, setData, editing, setEditing, saving, saveError, setSaveError, saveSuccess, setSaveSuccess,
    bannerUrl, setBannerUrl, profileImage, setProfileImage,
    editName, setEditName, editEmail, setEditEmail, editPhone, setEditPhone,
    editDepartment, setEditDepartment, editCompany, setEditCompany,
    editAddress, setEditAddress, editCity, setEditCity, editState, setEditState,
    editCountry, setEditCountry, editZipCode, setEditZipCode,
    editLinkedin, setEditLinkedin, editGithub, setEditGithub,
    editTwitter, setEditTwitter, editWebsite, setEditWebsite,
    editCompanyName, setEditCompanyName, editDomain, setEditDomain,
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
  };
}
