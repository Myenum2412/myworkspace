"use server";

import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function getRecentActivity(orgId: string) {
  return await db
    .collection(collections.activityLogs)
    .find({ orgId })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
}
