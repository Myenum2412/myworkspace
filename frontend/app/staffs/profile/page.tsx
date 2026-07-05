import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import ProfileClient from "./client";

export const dynamic = "force-dynamic";

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
    bannerUrl: string;
    image: string;
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

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const email = session.user.email;

  // Find user by email first, then id, then _id (mirrors /api/user/profile)
  let user: Record<string, unknown> | null = null;
  if (email) {
    user = (await db.collection(collections.users).findOne({ email })) as Record<string, unknown> | null;
  }
  if (!user) {
    user = (await db.collection(collections.users).findOne({ id: userId })) as Record<string, unknown> | null;
  }
  if (!user && ObjectId.isValid(userId)) {
    try {
      user = (await db.collection(collections.users).findOne({ _id: new ObjectId(userId) } as never)) as Record<string, unknown> | null;
    } catch {}
  }
  if (!user) {
    user = (await db.collection(collections.users).findOne({ _id: userId } as never)) as Record<string, unknown> | null;
  }

  if (!user) {
    return <ProfileClient data={{ user: null, org: null, memberCount: 0 }} />;
  }

  const orgId = await getUserOrgId(userId, email);

  let org: Record<string, unknown> | null = null;
  let memberCount = 0;

  if (orgId) {
    org = (await db.collection(collections.organizations).findOne({ id: orgId })) as Record<string, unknown> | null;
    if (!org) {
      org = (await db.collection(collections.organizations).findOne({ _id: orgId } as never)) as Record<string, unknown> | null;
    }
    memberCount = await db.collection(collections.orgMembers).countDocuments({ orgId });
  }

  const data: ProfileData = {
    user: {
      id: (user.id as string) || (user._id as { toString: () => string }).toString(),
      name: (user.name as string) || "",
      email: (user.email as string) || "",
      phone: (user.phone as string) || "",
      secondaryPhone: (user.secondaryPhone as string) || (user.alternateEmail as string) || "",
      department: (user.department as string) || "",
      company: (user.company as string) || "",
      address: (user.address as string) || "",
      city: (user.city as string) || "",
      state: (user.state as string) || "",
      country: (user.country as string) || "",
      zipCode: (user.zipCode as string) || "",
      linkedin: (user.linkedin as string) || "",
      github: (user.github as string) || "",
      twitter: (user.twitter as string) || "",
      website: (user.website as string) || "",
      status: (user.status as string) || "offline",
      role: (user.role as string) || "member",
      image: (user.image as string) || "",
      bannerUrl: (user.bannerUrl as string) || "",
      displayId: (user.displayId as string) || "",
      firstName: (user.firstName as string) || "",
      lastName: (user.lastName as string) || "",
      nickname: (user.nickname as string) || "",
      location: (user.location as string) || "",
      designation: (user.designation as string) || "",
      employmentType: (user.employmentType as string) || "",
      branchName: (user.branchName as string) || "",
      shift: (user.shift as string) || "",
      sourceOfHire: (user.sourceOfHire as string) || "",
      joiningDate: (user.joiningDate as string) || "",
      currentExperience: (user.currentExperience as string) || "",
      totalExperience: (user.totalExperience as string) || "",
      workExperience: (user.workExperience as ExperienceRow[]) || [],
      educationDetails: (user.educationDetails as EducationRow[]) || [],
      dependentDetails: (user.dependentDetails as DependentRow[]) || [],
      offerLetter: (user.offerLetter as string) || "",
      createdAt: user.createdAt ? new Date(user.createdAt as string).toISOString() : new Date().toISOString(),
    },
    org: org
      ? {
          id: (org.id as string) || (org._id as { toString: () => string }).toString(),
          name: (org.name as string) || "",
          domain: (org.domain as string) || "",
          businessType: (org.businessType as string) || "",
          industry: (org.industry as string) || "",
          gstNumber: (org.gstNumber as string) || "",
          panNumber: (org.panNumber as string) || "",
          cinNumber: (org.cinNumber as string) || "",
          companyEmail: (org.companyEmail as string) || "",
          mobileNumber: (org.mobileNumber as string) || "",
          alternateMobileNumber: (org.alternateMobileNumber as string) || "",
          website: (org.website as string) || "",
          addressLine1: (org.addressLine1 as string) || "",
          addressLine2: (org.addressLine2 as string) || "",
          city: (org.city as string) || "",
          state: (org.state as string) || "",
          pincode: (org.pincode as string) || "",
          country: (org.country as string) || "India",
          logoUrl: (org.logoUrl as string) || "",
          authorizedPersonName: (org.authorizedPersonName as string) || "",
          designation: (org.designation as string) || "",
          authorizedPersonEmail: (org.authorizedPersonEmail as string) || "",
          authorizedPersonMobile: (org.authorizedPersonMobile as string) || "",
          numberOfEmployees: (org.numberOfEmployees as number) || 0,
          companyDescription: (org.companyDescription as string) || "",
          plan: (org.plan as string) || "free",
          createdAt: org.createdAt ? new Date(org.createdAt as string).toISOString() : new Date().toISOString(),
        }
      : null,
    memberCount,
  };

  return <ProfileClient data={data} />;
}
