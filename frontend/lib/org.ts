import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ObjectId } from "mongodb";

const orgIdCache = new Map<string, { orgId: string; ts: number }>();
const CACHE_TTL = 120_000;

function toObjectId(id: string): ObjectId | null {
  try { return ObjectId.isValid(id) ? new ObjectId(id) : null; } catch { return null; }
}

export async function getUserOrgId(userId: string, email?: string): Promise<string | null> {
  const cacheKey = `${userId}:${email || ""}`;
  const cached = orgIdCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.orgId;

  const possibleIds = [userId];
  const objectIdIds: ObjectId[] = [];
  const oid = toObjectId(userId);
  if (oid) objectIdIds.push(oid);

  // Parallelize user lookups
  const queries: Promise<any>[] = [
    oid
      ? db.collection(collections.users).findOne({ $or: [{ _id: oid }, { id: userId }] })
      : db.collection(collections.users).findOne({ id: userId }),
  ];
  if (email) {
    queries.push(db.collection(collections.users).findOne({ email }));
  }

  const userResults = await Promise.all(queries);
  for (const userDoc of userResults) {
    if (userDoc) {
      if (userDoc.id) possibleIds.push(userDoc.id as string);
      if (userDoc._id) {
        const oidStr = (userDoc._id as ObjectId).toString();
        possibleIds.push(oidStr);
        const extraOid = toObjectId(oidStr);
        if (extraOid) objectIdIds.push(extraOid);
      }
    }
  }

  const uniqueIds = [...new Set(possibleIds)];
  const orConditions: Record<string, unknown>[] = [{ userId: { $in: uniqueIds } }];
  if (objectIdIds.length > 0) {
    orConditions.push({ userId: { $in: objectIdIds } });
  }

  // Query both org_members collections in parallel
  const [nextAuthMembers, mongooseMembers] = await Promise.all([
    db.collection(collections.orgMembers).find({ $or: orConditions }).toArray(),
    db.collection("orgmembers").find({ $or: orConditions }).toArray(),
  ]);

  const allMembers = [...(nextAuthMembers as unknown as Record<string, unknown>[]), ...(mongooseMembers as unknown as Record<string, unknown>[])];

  if (allMembers.length > 0) {
    if (allMembers.length === 1) {
      const orgId = String(allMembers[0].orgId);
      orgIdCache.set(cacheKey, { orgId, ts: Date.now() });
      return orgId;
    }

    const orgIds = [...new Set(allMembers.map(m => String(m.orgId)))];
    if (orgIds.length === 1) {
      orgIdCache.set(cacheKey, { orgId: orgIds[0], ts: Date.now() });
      return orgIds[0];
    }

    // Find org with most members (the user's primary org)
    const counts = await db.collection(collections.orgMembers).aggregate([
      { $match: { orgId: { $in: orgIds } } },
      { $group: { _id: "$orgId", count: { $sum: 1 } } },
    ]).toArray() as { _id: string; count: number }[];
    const countMap = new Map(counts.map(c => [c._id, c.count]));
    orgIds.sort((a, b) => (countMap.get(b) || 0) - (countMap.get(a) || 0));

    orgIdCache.set(cacheKey, { orgId: orgIds[0], ts: Date.now() });
    return orgIds[0];
  }

  return null;
}

async function resolvePossibleUserIds(userId: string, email?: string): Promise<string[]> {
  const ids = [userId];
  const oid = toObjectId(userId);

  const queries: Promise<any>[] = [
    oid
      ? db.collection(collections.users).findOne({ $or: [{ _id: oid }, { id: userId }] })
      : db.collection(collections.users).findOne({ id: userId }),
  ];
  if (email) {
    queries.push(db.collection(collections.users).findOne({ email }));
  }

  const results = await Promise.all(queries);
  for (const doc of results) {
    if (doc) {
      if (doc.id) ids.push(doc.id as string);
      if (doc._id) ids.push((doc._id as ObjectId).toString());
    }
  }
  return [...new Set(ids)];
}

export async function requireUserOrgId(
  userId: string,
  email?: string,
  tokenOrgId?: string,
): Promise<string> {
  if (tokenOrgId) return tokenOrgId;
  const orgId = await getUserOrgId(userId, email);
  if (orgId) return orgId;
  throw new Error("User is not associated with any organization");
}

export async function getOrgDetails(orgId: string): Promise<Record<string, unknown> | null> {
  if (!orgId) return null;

  const oid = toObjectId(orgId);
  const queries: Promise<any>[] = [
    db.collection(collections.organizations).findOne({ id: orgId }),
  ];
  if (oid) {
    queries.push(db.collection(collections.organizations).findOne({ _id: oid }));
  }

  const results = await Promise.all(queries);
  for (const org of results) {
    if (org) return org as Record<string, unknown>;
  }
  return null;
}

export async function validateOrgMembership(userId: string, orgId: string, email?: string): Promise<boolean> {
  const possibleIds = await resolvePossibleUserIds(userId, email);
  const objectIdIds = possibleIds.map(toObjectId).filter((oid): oid is ObjectId => oid !== null);
  const member = await db.collection(collections.orgMembers).findOne({
    $or: [
      { userId: { $in: possibleIds }, orgId },
      ...(objectIdIds.length > 0 ? [{ userId: { $in: objectIdIds }, orgId }] : []),
    ],
  });
  return !!member;
}

export async function ensureUserOrg(userId: string, email?: string): Promise<string> {
  const orgId = await getUserOrgId(userId, email);
  if (orgId) return orgId;

  const { v4: uuid } = await import("uuid");
  const possibleIds = await resolvePossibleUserIds(userId, email);
  const user = await db.collection(collections.users).findOne({ id: { $in: possibleIds } });

  const existingOrg = await db.collection(collections.organizations).findOne({}, { sort: { createdAt: 1 } });
  if (existingOrg) {
    const mainUserId = user?.id || possibleIds[0];
    await db.collection(collections.orgMembers).insertOne({
      id: uuid(),
      orgId: existingOrg.id,
      userId: mainUserId,
      role: "members",
      joinedAt: new Date(),
    });
    return existingOrg.id;
  }

  const userName = user?.name || user?.email?.split("@")[0] || "User";
  const newOrgId = uuid();
  const baseSlug = userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId.slice(0, 8)}`;
  const slugCheck = await db.collection(collections.organizations).findOne({ slug: baseSlug });
  const slug = slugCheck ? `${baseSlug}-${Date.now()}` : baseSlug;

  await db.collection(collections.organizations).insertOne({
    id: newOrgId,
    name: `${userName}'s Organization`,
    slug,
    plan: "free",
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mainUserId = user?.id || possibleIds[0];
  await db.collection(collections.orgMembers).insertOne({
    id: uuid(),
    orgId: newOrgId,
    userId: mainUserId,
    role: "members",
    joinedAt: new Date(),
  });

  return newOrgId;
}
