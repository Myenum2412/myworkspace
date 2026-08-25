"use server";

import { auth, unstable_update } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function completeTourAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const userId = session.user.id;

  try {
    await db
      .collection(collections.users)
      .updateOne({ id: userId }, { $set: { tourCompleted: true, updatedAt: new Date() } });

    await unstable_update({});

    return { success: true };
  } catch (err) {
    console.error("[TOUR] Failed to mark tour as completed:", err);
    return { error: "Failed to save tour completion status" };
  }
}

export async function resetTourAction(userId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const isAdmin = session.user.role === "org_admin";
  if (!isAdmin) {
    return { error: "Unauthorized" };
  }

  try {
    await db
      .collection(collections.users)
      .updateOne({ id: userId }, { $set: { tourCompleted: false, updatedAt: new Date() } });
    return { success: true };
  } catch (err) {
    console.error("[TOUR] Failed to reset tour status:", err);
    return { error: "Failed to reset tour status" };
  }
}
