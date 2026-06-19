import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function getUserOrgId(userId: string): Promise<string | null> {
  const member = await db.collection(collections.orgMembers).findOne({ userId });
  return member ? (member.orgId as string) : null;
}
