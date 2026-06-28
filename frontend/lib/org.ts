import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ObjectId } from "mongodb";

export async function getUserOrgId(userId: string, email?: string): Promise<string | null> {
  const possibleIds = await resolvePossibleUserIds(userId, email);
  const members = await (await db.collection(collections.orgMembers).find({ userId: { $in: possibleIds } }).toArray()) as Record<string, unknown>[];
  if (members.length === 0) return null;
  if (members.length === 1) return String(members[0].orgId);
  const orgIds = [...new Set(members.map(m => String(m.orgId)))];
  const counts = await (await db.collection(collections.orgMembers).aggregate([
    { $match: { orgId: { $in: orgIds } } },
    { $group: { _id: "$orgId", count: { $sum: 1 } } },
  ]).toArray()) as { _id: string; count: number }[];
  const countMap = new Map(counts.map(c => [c._id, c.count]));
  orgIds.sort((a, b) => (countMap.get(b) || 0) - (countMap.get(a) || 0));
  return orgIds[0];
}

async function resolvePossibleUserIds(userId: string, email?: string): Promise<string[]> {
  const ids = [userId];
  let sessionUserObjId: ObjectId | undefined;
  try { sessionUserObjId = new ObjectId(userId); } catch {}
  const userQuery: Record<string, unknown> = sessionUserObjId
    ? { $or: [{ _id: sessionUserObjId }, { id: userId }] }
    : { id: userId };
  const userDoc = await db.collection(collections.users).findOne(userQuery);
  if (userDoc) {
    if (userDoc.id) ids.push(userDoc.id as string);
    if (userDoc._id) ids.push((userDoc._id as ObjectId).toString());
  }
  if (email) {
    const userByEmail = await db.collection(collections.users).findOne({ email });
    if (userByEmail) {
      if (userByEmail.id) ids.push(userByEmail.id as string);
      if (userByEmail._id) ids.push((userByEmail._id as ObjectId).toString());
    }
  }
  return [...new Set(ids)];
}

export async function requireUserOrgId(userId: string, email?: string): Promise<string> {
  const orgId = await getUserOrgId(userId, email);
  if (!orgId) throw new Error("User is not associated with any organization");
  return orgId;
}

export async function validateOrgMembership(userId: string, orgId: string, email?: string): Promise<boolean> {
  const possibleIds = await resolvePossibleUserIds(userId, email);
  const member = await db.collection(collections.orgMembers).findOne({ userId: { $in: possibleIds }, orgId });
  return !!member;
}

export async function ensureUserOrg(userId: string, email?: string): Promise<string> {
  const orgId = await getUserOrgId(userId, email);
  if (orgId) return orgId;

  const { v4: uuid } = await import("uuid");
  const possibleIds = await resolvePossibleUserIds(userId, email);
  const user = await db.collection(collections.users).findOne({ id: { $in: possibleIds } });
  const userName = user?.name || user?.email?.split("@")[0] || "User";
  const newOrgId = uuid();
  const baseSlug = userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId.slice(0, 8)}`;
  const slug = baseSlug + (await slugExists(baseSlug) ? `-${Date.now()}` : "");

  await db.collection(collections.organizations).insertOne({
    id: newOrgId,
    name: `${userName}'s Organization`,
    slug,
    plan: "starter",
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const mainUserId = user?.id || possibleIds[0];
  await db.collection(collections.orgMembers).insertOne({
    id: uuid(),
    orgId: newOrgId,
    userId: mainUserId,
    role: "admin",
    joinedAt: new Date(),
  });
  return newOrgId;
}

async function slugExists(slug: string): Promise<boolean> {
  const existing = await db.collection(collections.organizations).findOne({ slug });
  return !!existing;
}
