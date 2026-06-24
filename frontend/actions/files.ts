"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth/config";
import { deleteFile } from "@/lib/storage";
import { getUserOrgId } from "@/lib/org";

async function requireOrgId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  let orgId = await getUserOrgId(session.user.id);
  if (!orgId) {
    const user = await db.collection(collections.users).findOne({ id: session.user.id });
    const userName = user?.name || user?.email?.split("@")[0] || "User";
    const newOrgId = uuid();
    await db.collection(collections.organizations).insertOne({
      id: newOrgId,
      name: `${userName}'s Organization`,
      slug: userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${session.user.id.slice(0, 8)}`,
      plan: "starter",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.collection(collections.orgMembers).insertOne({
      id: uuid(),
      orgId: newOrgId,
      userId: session.user.id,
      role: "admin",
      joinedAt: new Date(),
    });
    orgId = newOrgId;
  }
  return orgId;
}

export async function deleteFileAction(fileId: string) {
  let orgId: string;
  try { orgId = await requireOrgId(); } catch { return { error: "Unauthorized" }; }

  const session = await auth();
  const file = await db.collection(collections.fileAttachments).findOne({ id: fileId });

  if (!file) return { error: "File not found" };
  if (!session?.user?.id) return { error: "Unauthorized" };
  if (file.uploaderId !== session.user.id) return { error: "Not your file" };

  await deleteFile(file.storagePath);
  await db.collection(collections.fileAttachments).deleteOne({ id: fileId });

  await db.collection(collections.activityLogs).insertOne({
    id: uuid(),
    orgId,
    userId: session.user.id,
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
  let orgId: string;
  try { orgId = await requireOrgId(); } catch { return { error: "Unauthorized" }; }

  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const existing = await db.collection(collections.fileShares).findOne({
    fileId,
    sharedWithUserId: sharedWithUserId,
  });

  if (!existing) {
    await db.collection(collections.fileShares).insertOne({
      id: uuid(),
      fileId,
      sharedByUserId: session.user.id,
      sharedWithUserId: sharedWithUserId || null,
      orgId,
    });

    await db.collection(collections.activityLogs).insertOne({
      id: uuid(),
      orgId,
    userId: session.user.id,
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
