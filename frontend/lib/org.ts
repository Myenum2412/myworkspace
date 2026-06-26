import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ObjectId } from "mongodb";

export async function getUserOrgId(userId: string): Promise<string | null> {
  let member = await db.collection(collections.orgMembers).findOne({ userId });
  if (!member) {
    try {
      if (ObjectId.isValid(userId)) {
        member = await db.collection(collections.orgMembers).findOne({ userId: new ObjectId(userId) } as never);
      }
    } catch {}
  }
  if (!member) {
    member = await db.collection(collections.orgMembers).findOne({ $or: [{ userId }, { userId: userId }] } as never);
  }
  return member?.orgId ? String(member.orgId) : null;
}

export async function requireUserOrgId(userId: string): Promise<string> {
  const orgId = await getUserOrgId(userId);
  if (!orgId) throw new Error("User is not associated with any organization");
  return orgId;
}

export async function validateOrgMembership(userId: string, orgId: string): Promise<boolean> {
  const member = await db.collection(collections.orgMembers).findOne({ userId, orgId });
  return !!member;
}

export async function ensureUserOrg(userId: string): Promise<string> {
  const orgId = await getUserOrgId(userId);
  if (orgId) return orgId;

  const { v4: uuid } = await import("uuid");
  const user = await db.collection(collections.users).findOne({ id: userId });
  const userName = user?.name || user?.email?.split("@")[0] || "User";
  const newOrgId = uuid();

  await db.collection(collections.organizations).insertOne({
    id: newOrgId,
    name: `${userName}'s Organization`,
    slug: userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId.slice(0, 8)}`,
    plan: "starter",
    onboardingCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.collection(collections.orgMembers).insertOne({
    id: uuid(),
    orgId: newOrgId,
    userId,
    role: "admin",
    joinedAt: new Date(),
  });
  return newOrgId;
}
