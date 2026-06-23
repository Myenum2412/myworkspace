import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ObjectId } from "mongodb";

export async function getUserOrgId(userId: string): Promise<string | null> {
  // Try string userId first (signup flow stores string UUIDs)
  let member = await db.collection(collections.orgMembers).findOne({ userId });
  // Fallback: seed scripts store userId as ObjectId — try both
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
