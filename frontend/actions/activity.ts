"use server";

import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getRecentActivity(orgId: string) {
  return db
    .select()
    .from(schema.activityLogs)
    .where(eq(schema.activityLogs.orgId, orgId))
    .orderBy(desc(schema.activityLogs.createdAt))
    .limit(20)
    .all();
}
