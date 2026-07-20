"use server";

import { auth, unstable_update } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/rbac";

export interface OnboardingData {
  plan: string;
  companyDetails: {
    businessType: string;
    industry: string;
    gstNumber: string;
    panNumber: string;
    cinNumber: string;
    companyEmail: string;
    mobileNumber: string;
    website: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    authorizedPersonName: string;
    designation: string;
    authorizedPersonEmail: string;
    authorizedPersonMobile: string;
    numberOfEmployees: string;
    companyDescription: string;
  };
}

export async function completeOnboarding(data: OnboardingData) {

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?error=Please+sign+in+to+complete+onboarding");
  }

  const userId = session.user.id;
  const userRole = session.user.role;
  const isOrgAdmin = userRole === ROLES.ORG_ADMIN;
  if (isOrgAdmin) {
    redirect("/orgmenu");
  }

  let member = await db.collection(collections.orgMembers).findOne({ userId });

  
  let orgId = member?.orgId;
  if (!member) {
    const org = await db.collection(collections.organizations).findOne({ ownerId: userId });
  
    if (!org) {
      redirect("/login?error=No+organization+found");
    }
    orgId = org.id;
    await db.collection(collections.orgMembers).insertOne({
      id: crypto.randomUUID(),
      orgId: org.id,
      userId,
      role: ROLES.MEMBERS,
      joinedAt: new Date(),
    });
  
  }

  const updateFields: Record<string, unknown> = {
    plan: data.plan,
    businessType: data.companyDetails.businessType,
    industry: data.companyDetails.industry,
    companyEmail: data.companyDetails.companyEmail,
    mobileNumber: data.companyDetails.mobileNumber,
    addressLine1: data.companyDetails.addressLine1,
    addressLine2: data.companyDetails.addressLine2,
    city: data.companyDetails.city,
    state: data.companyDetails.state,
    pincode: data.companyDetails.pincode,
    country: data.companyDetails.country,
    authorizedPersonName: data.companyDetails.authorizedPersonName,
    authorizedPersonEmail: data.companyDetails.authorizedPersonEmail,
    numberOfEmployees: data.companyDetails.numberOfEmployees ? Number(data.companyDetails.numberOfEmployees) : undefined,
    companyDescription: data.companyDetails.companyDescription,
    onboardingCompleted: true,
    updatedAt: new Date(),
  };

  if (data.companyDetails.gstNumber) updateFields.gstNumber = data.companyDetails.gstNumber;
  if (data.companyDetails.panNumber) updateFields.panNumber = data.companyDetails.panNumber;
  if (data.companyDetails.cinNumber) updateFields.cinNumber = data.companyDetails.cinNumber;
  if (data.companyDetails.website) updateFields.website = data.companyDetails.website;
  if (data.companyDetails.designation) updateFields.designation = data.companyDetails.designation;
  if (data.companyDetails.authorizedPersonMobile) updateFields.authorizedPersonMobile = data.companyDetails.authorizedPersonMobile;


  await db.collection(collections.organizations).updateOne(
    { id: orgId },
    { $set: updateFields }
  );


  const userUpdateFields: Record<string, unknown> = {
    designation: data.companyDetails.designation || "",
    department: data.companyDetails.industry || "",
    phone: data.companyDetails.authorizedPersonMobile || data.companyDetails.mobileNumber || "",
    location: [data.companyDetails.city, data.companyDetails.state, data.companyDetails.country].filter(Boolean).join(", "),
    updatedAt: new Date(),
  };
  await db.collection(collections.users).updateOne(
    { id: userId },
    { $set: userUpdateFields }
  );

  await db.collection(collections.activityLogs).insertOne({
    id: crypto.randomUUID(),
    orgId,
    userId,
    action: "onboarding.completed",
    entityType: "organization",
    entityId: orgId,
    description: `Onboarding completed with plan: ${data.plan}`,
    createdAt: new Date(),
  });

  await unstable_update({});
  revalidatePath("/dashboard");
  revalidatePath("/orgmenu/members");
  revalidateTag('dashboard', 'max');
  redirect("/dashboard");
}
