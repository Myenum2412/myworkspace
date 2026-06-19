"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const orgId = await getUserOrgId(session.user.id);
  if (!orgId) throw new Error("No organization found");
  return { orgId, userId: session.user.id };
}

export async function createTask(formData: FormData) {
  let sessionData: { orgId: string; userId: string };
  try { sessionData = await requireSession(); } catch { return { error: "Unauthorized" }; }
  const { orgId, userId } = sessionData;

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as string || "medium";
  const assigneeId = formData.get("assigneeId") as string;
  const teamId = formData.get("teamId") as string;
  const dueDate = formData.get("dueDate") as string;

  if (!title) return { error: "Title is required" };

  const taskId = uuid();

  await db.collection(collections.tasks).insertOne({
    id: taskId,
    orgId,
    teamId: teamId || null,
    assigneeId: assigneeId || userId,
    creatorId: userId,
    title,
    description: description || null,
    priority: priority as "low" | "medium" | "high" | "urgent",
    dueDate: dueDate ? new Date(dueDate) : null,
  });

  await db.collection(collections.activityLogs).insertOne({
    id: uuid(),
    orgId,
    userId,
    action: "task.created",
    entityType: "task",
    entityId: taskId,
    description: `Task "${title}" created`,
  });

  revalidateTag(`tasks:${orgId}`, 'max');
  revalidatePath("/overview", "page");
  revalidatePath("/dashboard", "page");

  return { success: true, taskId };
}

export async function updateTask(formData: FormData) {
  let sessionData: { orgId: string; userId: string };
  try { sessionData = await requireSession(); } catch { return { error: "Unauthorized" }; }
  const { orgId, userId } = sessionData;

  const taskId = formData.get("id") as string;
  const title = formData.get("title") as string;
  const status = formData.get("status") as string;
  const priority = formData.get("priority") as string;
  const assigneeId = formData.get("assigneeId") as string;
  const description = formData.get("description") as string;

  if (!taskId) return { error: "Task ID is required" };

  const updates: Record<string, string | Date | null> = { updatedAt: new Date() };
  if (title) updates.title = title;
  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (assigneeId) updates.assigneeId = assigneeId;
  if (description !== undefined) updates.description = description;

  await db.collection(collections.tasks).updateOne(
    { id: taskId },
    { $set: updates }
  );

  await db.collection(collections.activityLogs).insertOne({
    id: uuid(),
    orgId,
    userId,
    action: "task.updated",
    entityType: "task",
    entityId: taskId,
    description: `Task updated: ${status ? `status changed to ${status}` : title ? `title updated` : ""}`,
  });

  revalidateTag(`tasks:${orgId}`, 'max');
  revalidatePath("/overview", "page");
  revalidatePath("/dashboard", "page");

  return { success: true };
}

export async function deleteTask(formData: FormData) {
  let sessionData: { orgId: string; userId: string };
  try { sessionData = await requireSession(); } catch { return { error: "Unauthorized" }; }
  const { orgId } = sessionData;

  const taskId = formData.get("id") as string;
  if (!taskId) return { error: "Task ID is required" };

  await db.collection(collections.tasks).deleteOne({ id: taskId });

  revalidateTag(`tasks:${orgId}`, 'max');
  revalidatePath("/overview", "page");
  revalidatePath("/dashboard", "page");

  return { success: true };
}

export async function updateTaskStatus(taskId: string, status: string) {
  let sessionData: { orgId: string; userId: string };
  try { sessionData = await requireSession(); } catch { return { error: "Unauthorized" }; }
  const { orgId } = sessionData;

  await db.collection(collections.tasks).updateOne(
    { id: taskId },
    { $set: { status: status as "todo" | "in_progress" | "review" | "done" | "cancelled", updatedAt: new Date() } }
  );

  revalidateTag(`tasks:${orgId}`, 'max');
  return { success: true };
}
