import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { AdminProfilePageClient } from "./profile";

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
  preferredLanguage: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  websiteVerified: boolean;
  businessVerified: boolean;
  addressVerified: boolean;
  documentsVerified: boolean;
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
  if (!email) {
    return <AdminProfilePageClient data={{ user: null, org: null, memberCount: 0 }} />;
  }

  // Fetch user by email (matches backend /api/user/profile logic)
  const userDoc = (await db.collection(collections.users).findOne({ email })) as Record<string, unknown> | null;

  if (!userDoc) {
    return <AdminProfilePageClient data={{ user: null, org: null, memberCount: 0 }} />;
  }

  const userId = (userDoc.id as string) || String(userDoc._id || "");

  // Find org membership
  const member = (await db.collection(collections.orgMembers).findOne({ userId })) as Record<string, unknown> | null;

  let orgData: ProfileOrg | null = null;
  let memberCount = 0;

  if (member?.orgId) {
    const orgId = String(member.orgId);
    let orgObjId: ObjectId | undefined;
    try { orgObjId = new ObjectId(orgId); } catch { /* not an ObjectId */ }
    const org = (await db.collection(collections.organizations).findOne(
      orgObjId ? { $or: [{ id: orgId }, { _id: orgObjId }] } : { id: orgId }
    )) as Record<string, unknown> | null;

    if (org) {
      memberCount = await db.collection(collections.orgMembers).countDocuments({ orgId });
      orgData = {
        id: (org.id as string) || String(org._id || ""),
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
        tradeName: (org.tradeName as string) || "",
        yearEstablished: (org.yearEstablished as string) || "",
        companySize: (org.companySize as string) || "",
        registrationNumber: (org.registrationNumber as string) || "",
        registrationAuthority: (org.registrationAuthority as string) || "",
        taxIdentificationNumber: (org.taxIdentificationNumber as string) || "",
        registrationDate: (org.registrationDate as string) || "",
        businessStatus: (org.businessStatus as string) || "Active",
        supportEmail: (org.supportEmail as string) || "",
        supportPhone: (org.supportPhone as string) || "",
        facebook: (org.facebook as string) || "",
        instagram: (org.instagram as string) || "",
        twitterHandle: (org.twitterHandle as string) || "",
        youtube: (org.youtube as string) || "",
        primaryBusinessActivity: (org.primaryBusinessActivity as string) || "",
        secondaryBusinessActivity: (org.secondaryBusinessActivity as string) || "",
        operatingCountries: (org.operatingCountries as string) || "",
        timeZone: (org.timeZone as string) || "",
        preferredCurrency: (org.preferredCurrency as string) || "",
        preferredLanguage: (org.preferredLanguage as string) || "",
        emailVerified: (org.emailVerified as boolean) || false,
        phoneVerified: (org.phoneVerified as boolean) || false,
        websiteVerified: (org.websiteVerified as boolean) || false,
        businessVerified: (org.businessVerified as boolean) || false,
        addressVerified: (org.addressVerified as boolean) || false,
        documentsVerified: (org.documentsVerified as boolean) || false,
      };
    }
  }

  const userData: ProfileUser = {
    id: String(userDoc._id || ""),
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

  return <AdminProfilePageClient data={{ user: userData, org: orgData, memberCount }} />;
}
