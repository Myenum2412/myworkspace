import { Suspense } from "react";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { ProfilePageInteractive } from "./profile-interactive";

export const dynamic = "force-dynamic";

type ProfileUser = {
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
};

type ProfileOrg = {
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
};

type ProfileData = {
  user: ProfileUser | null;
  org: ProfileOrg | null;
  memberCount: number;
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const email = session.user.email;
  const userId = session.user.id;

  // Fetch user — try email first, then id, then _id (matches backend /api/user/profile logic)
  let userDoc: Record<string, unknown> | null = null;
  if (email) {
    userDoc = (await db.collection(collections.users).findOne({ email })) as Record<string, unknown> | null;
  }
  if (!userDoc) {
    userDoc = (await db.collection(collections.users).findOne({ id: userId })) as Record<string, unknown> | null;
  }
  if (!userDoc) {
    try {
      if (ObjectId.isValid(userId)) {
        userDoc = (await db.collection(collections.users).findOne({ _id: new ObjectId(userId) } as never)) as Record<string, unknown> | null;
      }
    } catch {}
  }
  if (!userDoc) {
    userDoc = (await db.collection(collections.users).findOne({ _id: userId } as never)) as Record<string, unknown> | null;
  }

  if (!userDoc) {
    return (
      <Suspense fallback={<div className="flex flex-1 items-center justify-center text-muted-foreground">Loading...</div>}>
        <ProfilePageInteractive data={{ user: null, org: null, memberCount: 0 }} />
      </Suspense>
    );
  }

  const dbUserId = (userDoc.id as string) || String(userDoc._id || "");

  // Find org membership
  const member = (await db.collection(collections.orgMembers).findOne({ userId: dbUserId })) as Record<string, unknown> | null;

  let orgData: ProfileOrg | null = null;
  let memberCount = 0;

  if (member?.orgId) {
    const memberOrgId = String(member.orgId);
    let orgObjId: ObjectId | undefined;
    try { orgObjId = new ObjectId(memberOrgId); } catch { /* not an ObjectId */ }
    const org = (await db.collection(collections.organizations).findOne(
      orgObjId ? { $or: [{ id: memberOrgId }, { _id: orgObjId }] } : { id: memberOrgId }
    )) as Record<string, unknown> | null;

    if (org) {
      memberCount = await db.collection(collections.orgMembers).countDocuments({ orgId: member.orgId });
      orgData = {
        id: memberOrgId,
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
        logoUrl: (org.logoUrl as string) || (org.logo as string) || "",
        authorizedPersonName: (org.authorizedPersonName as string) || "",
        designation: (org.designation as string) || "",
        authorizedPersonEmail: (org.authorizedPersonEmail as string) || "",
        authorizedPersonMobile: (org.authorizedPersonMobile as string) || "",
        numberOfEmployees: (org.numberOfEmployees as number) || 0,
        companyDescription: (org.companyDescription as string) || "",
        plan: (org.plan as string) || "free",
        createdAt: org.createdAt ? String(org.createdAt) : new Date().toISOString(),
      };
    }
  }

  const userData: ProfileUser = {
    id: (userDoc.id as string) || String(userDoc._id || ""),
    name: (userDoc.name as string) || "",
    email: (userDoc.email as string) || "",
    phone: (userDoc.phone as string) || "",
    department: (userDoc.department as string) || "",
    company: (userDoc.company as string) || "",
    address: (userDoc.address as string) || "",
    city: (userDoc.city as string) || "",
    state: (userDoc.state as string) || "",
    country: (userDoc.country as string) || "",
    zipCode: (userDoc.zipCode as string) || "",
    linkedin: (userDoc.linkedin as string) || "",
    github: (userDoc.github as string) || "",
    twitter: (userDoc.twitter as string) || "",
    website: (userDoc.website as string) || "",
    status: (userDoc.status as string) || "offline",
    role: (userDoc.role as string) || "member",
    image: (userDoc.image as string) || "",
    bannerUrl: (userDoc.bannerUrl as string) || "",
    createdAt: userDoc.createdAt ? String(userDoc.createdAt) : new Date().toISOString(),
  };

  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center text-muted-foreground">Loading...</div>}>
      <ProfilePageInteractive data={{ user: userData, org: orgData, memberCount }} />
    </Suspense>
  );
}
