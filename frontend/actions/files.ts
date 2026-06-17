"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth/config";
import { deleteFile } from "@/lib/storage";

export async function deleteFileAction(fileId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const file = db
    .select()
    .from(schema.fileAttachments)
    .where(eq(schema.fileAttachments.id, fileId))
    .get();

  if (!file) return { error: "File not found" };
  if (file.uploaderId !== session.user.id) return { error: "Not your file" };

  deleteFile(file.storagePath);
  db.delete(schema.fileAttachments)
    .where(eq(schema.fileAttachments.id, fileId))
    .run();

  db.insert(schema.activityLogs).values({
    id: uuid(),
    orgId: "demo-org-id",
    userId: session.user.id,
    action: "file.deleted",
    entityType: "file",
    entityId: fileId,
    description: `File "${file.originalName}" deleted`,
  }).run();

  revalidatePath("/files");
  revalidatePath("/shared");

  return { success: true };
}

export async function shareFileAction(fileId: string, sharedWithUserId: string | null) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const existing = db
    .select()
    .from(schema.fileShares)
    .where(
      and(
        eq(schema.fileShares.fileId, fileId),
        sharedWithUserId
          ? eq(schema.fileShares.sharedWithUserId, sharedWithUserId)
          : and(
              eq(schema.fileShares.sharedWithUserId, sharedWithUserId ?? ""),
              eq(schema.fileShares.sharedWithUserId, sharedWithUserId ?? "")
            )
      )
    )
    .get();

  if (!existing) {
    db.insert(schema.fileShares).values({
      id: uuid(),
      fileId,
      sharedByUserId: session.user.id,
      sharedWithUserId: sharedWithUserId || null,
      orgId: "demo-org-id",
    }).run();

    db.insert(schema.activityLogs).values({
      id: uuid(),
      orgId: "demo-org-id",
      userId: session.user.id,
      action: "file.shared",
      entityType: "file",
      entityId: fileId,
      description: `File shared`,
    }).run();
  }

  revalidatePath("/files");
  revalidatePath("/shared");

  return { success: true };
}

export async function unshareFileAction(shareId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  db.delete(schema.fileShares)
    .where(eq(schema.fileShares.id, shareId))
    .run();

  revalidatePath("/files");
  revalidatePath("/shared");

  return { success: true };
}
