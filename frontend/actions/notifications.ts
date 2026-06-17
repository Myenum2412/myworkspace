"use server";

import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";

export async function getNotifications() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await db
    .collection(collections.notifications)
    .find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
}

export async function getUnreadCount() {
  const session = await auth();
  if (!session?.user?.id) return 0;

  return await db
    .collection(collections.notifications)
    .countDocuments({ userId: session.user.id });
}
