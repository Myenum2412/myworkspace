import { Suspense } from "react";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import ProfileLeafInteractive from "./profile-leaf-interactive";

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
  plan: string;
};

type ProfileData = {
  user: ProfileUser | null;
  org: ProfileOrg | null;
};

export default async function OrgProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const email = session.user.email;
  if (!email) {
    return (
      <Suspense fallback={null}>
        <ProfileLeafInteractive data={{ user: null, org: null }} />
      </Suspense>
    );
  }

  // Fetch user by email (matches backend /api/user/profile logic)
  const userDoc = (await db.collection(collections.users).findOne({ email })) as Record<string, unknown> | null;

  if (!userDoc) {
    return (
      <Suspense fallback={null}>
        <ProfileLeafInteractive data={{ user: null, org: null }} />
      </Suspense>
    );
  }

  const userId = (userDoc.id as string) || String(userDoc._id || "");

  // Find org membership
  const member = (await db.collection(collections.orgMembers).findOne({ userId })) as Record<string, unknown> | null;

  let orgData: ProfileOrg | null = null;

  if (member?.orgId) {
    const orgId = String(member.orgId);
    let orgObjId: ObjectId | undefined;
    try { orgObjId = new ObjectId(orgId); } catch { /* not an ObjectId */ }
    const org = (await db.collection(collections.organizations).findOne(
      orgObjId ? { $or: [{ id: orgId }, { _id: orgObjId }] } : { id: orgId }
    )) as Record<string, unknown> | null;

    if (org) {
      orgData = {
        id: (org.id as string) || String(org._id || ""),
        name: (org.name as string) || "",
        domain: (org.domain as string) || "",
        plan: (org.plan as string) || "free",
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

  return (
    <Suspense fallback={null}>
      <ProfileLeafInteractive data={{ user: userData, org: orgData }} />
    </Suspense>
  );
}
