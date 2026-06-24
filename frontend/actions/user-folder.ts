"use server";

import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function createUserWorkspace(userId: string, userName: string, orgId: string) {
  try {
    const existing = await db.collection(collections.fileAttachments).findOne({
      uploaderId: userId,
      mimeType: "application/vnd.workspace-folder",
    });

    if (existing) return { success: true };

    await db.collection(collections.fileAttachments).insertOne({
      id: `workspace-${userId}`,
      orgId,
      uploaderId: userId,
      name: `${userName}'s Workspace`,
      originalName: `${userName}'s Workspace`,
      mimeType: "application/vnd.workspace-folder",
      size: 0,
      storagePath: `users/${userId}/`,
      description: `Auto-created workspace folder for ${userName}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to create user workspace:", error);
    return { error: "Failed to create workspace" };
  }
}
