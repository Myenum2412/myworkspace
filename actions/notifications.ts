"use server";

import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { auth } from "@/lib/auth/config";

export async function getNotifications() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, session.user.id))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(50)
    .all();
}

export async function getUnreadCount() {
  const session = await auth();
  if (!session?.user?.id) return 0;

  const results = db
    .select({ count: count() })
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, session.user.id))
    .all();

  return results[0]?.count ?? 0;
}
