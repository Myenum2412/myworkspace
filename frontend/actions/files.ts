"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth/config";
import { deleteFile } from "@/lib/storage";
import { getUserOrgId } from "@/lib/org";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const orgId = await getUserOrgId(session.user.id);
  if (!orgId) throw new Error("No organization found");
  return { orgId, userId: session.user.id };
}

export async function deleteFileAction(fileId: string) {
  let sessionData: { orgId: string; userId: string };
  try { sessionData = await requireSession(); } catch { return { error: "Unauthorized" }; }
  const { orgId, userId } = sessionData;

  const file = await db.collection(collections.fileAttachments).findOne({ id: fileId });

  if (!file) return { error: "File not found" };
  if (file.uploaderId !== userId) return { error: "Not your file" };

  deleteFile(file.storagePath);
  await db.collection(collections.fileAttachments).deleteOne({ id: fileId });

  await db.collection(collections.activityLogs).insertOne({
    id: uuid(),
    orgId,
    userId,
    action: "file.deleted",
    entityType: "file",
    entityId: fileId,
    description: `File "${file.originalName}" deleted`,
  });

  revalidatePath("/files");
  revalidatePath("/shared");

  return { success: true };
}

export async function shareFileAction(fileId: string, sharedWithUserId: string | null) {
  let sessionData: { orgId: string; userId: string };
  try { sessionData = await requireSession(); } catch { return { error: "Unauthorized" }; }
  const { orgId, userId } = sessionData;

  const existing = await db.collection(collections.fileShares).findOne({
    fileId,
    sharedWithUserId: sharedWithUserId,
  });

  if (!existing) {
    await db.collection(collections.fileShares).insertOne({
      id: uuid(),
      fileId,
      sharedByUserId: userId,
      sharedWithUserId: sharedWithUserId || null,
      orgId,
    });

    await db.collection(collections.activityLogs).insertOne({
      id: uuid(),
      orgId,
      userId,
      action: "file.shared",
      entityType: "file",
      entityId: fileId,
      description: `File shared`,
    });
  }

  revalidatePath("/files");
  revalidatePath("/shared");

  return { success: true };
}

export async function unshareFileAction(shareId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await db.collection(collections.fileShares).deleteOne({ id: shareId });

  revalidatePath("/files");
  revalidatePath("/shared");

  return { success: true };
}
