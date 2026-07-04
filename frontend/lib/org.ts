import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ObjectId } from "mongodb";

export async function getUserOrgId(userId: string, email?: string): Promise<string | null> {
  const possibleIds = await resolvePossibleUserIds(userId, email);

  const objectIdIds = possibleIds
    .map((id) => { try { return new ObjectId(id); } catch { return null; } })
    .filter((oid): oid is ObjectId => oid !== null);

  // Query NextAuth org_members collection FIRST — the JWT/Session uses this
  // orgId format (UUID), and the majority of frontend features (projects,
  // clients, etc.) operate with it. Some userId fields are stored as ObjectId,
  // others as string, so match both to avoid type-sensitive $in failures.
  const nextAuthMembers = await db.collection(collections.orgMembers).find({
    $or: [
      { userId: { $in: possibleIds } },
      ...(objectIdIds.length > 0 ? [{ userId: { $in: objectIdIds } }] : []),
    ],
  }).toArray() as unknown as Record<string, unknown>[];
  if (nextAuthMembers.length > 0) {
    if (nextAuthMembers.length === 1) return String(nextAuthMembers[0].orgId);
    const orgIds = [...new Set(nextAuthMembers.map(m => String(m.orgId)))];
    const counts = await db.collection(collections.orgMembers).aggregate([
      { $match: { orgId: { $in: orgIds } } },
      { $group: { _id: "$orgId", count: { $sum: 1 } } },
    ]).toArray() as { _id: string; count: number }[];
    const countMap = new Map(counts.map(c => [c._id, c.count]));
    orgIds.sort((a, b) => (countMap.get(b) || 0) - (countMap.get(a) || 0));
    return orgIds[0];
  }

  // Fallback to Mongoose orgmembers collection
  const mongooseMembers = await db.collection("orgmembers").find({
    $or: [
      { userId: { $in: possibleIds } },
      ...(objectIdIds.length > 0 ? [{ userId: { $in: objectIdIds } }] : []),
    ],
  }).toArray() as unknown as Record<string, unknown>[];
  if (mongooseMembers.length > 0) {
    const objIdMatch = mongooseMembers.find((m) => typeof m.userId !== "string");
    if (objIdMatch) return String(objIdMatch.orgId);
    return String(mongooseMembers[0].orgId);
  }

  return null;
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

/**
 * Resolve the user's active orgId.
 *
 * Order of precedence:
 *   1. `tokenOrgId` — already present on the JWT/session. Trust it; do NOT
 *      throw just because the DB lookup below is momentarily out of sync.
 *   2. OrgMember lookup by userId/email (handles legacy sessions whose token
 *      was issued before orgId was embedded).
 *
 * Throws ONLY when neither source yields an orgId. The caller decides how to
 * surface the message — API routes map it to 400/403, pages show a graceful
 * "no organization" state instead of a hard crash.
 */
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

/**
 * Fetch the organization record for an orgId.
 * Tries string `id` first, then ObjectId `_id`. Returns null if missing
 * (orgId present but org doc deleted) so callers can show a graceful
 * fallback instead of throwing.
 */
export async function getOrgDetails(orgId: string): Promise<Record<string, unknown> | null> {
  if (!orgId) return null;
  const org = await db.collection(collections.organizations).findOne({ id: orgId });
  if (org) return org as Record<string, unknown>;
  let byObjectId: Record<string, unknown> | null = null;
  try {
    if (ObjectId.isValid(orgId)) {
      byObjectId = (await db.collection(collections.organizations).findOne(
        { _id: new ObjectId(orgId) },
      )) as Record<string, unknown> | null;
    }
  } catch {}
  return byObjectId;
}

export async function validateOrgMembership(userId: string, orgId: string, email?: string): Promise<boolean> {
  const possibleIds = await resolvePossibleUserIds(userId, email);
  const objectIdIds = possibleIds
    .map((id) => { try { return new ObjectId(id); } catch { return null; } })
    .filter((oid): oid is ObjectId => oid !== null);
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
      role: "admin",
      joinedAt: new Date(),
    });
    return existingOrg.id;
  }

  const userName = user?.name || user?.email?.split("@")[0] || "User";
  const newOrgId = uuid();
  const baseSlug = userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId.slice(0, 8)}`;
  const slug = baseSlug + (await slugExists(baseSlug) ? `-${Date.now()}` : "");

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
    role: "admin",
    joinedAt: new Date(),
  });
  return newOrgId;
}

async function slugExists(slug: string): Promise<boolean> {
  const existing = await db.collection(collections.organizations).findOne({ slug });
  return !!existing;
}
