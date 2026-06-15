"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth/config";

export async function createTask(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as string || "medium";
  const assigneeId = formData.get("assigneeId") as string;
  const teamId = formData.get("teamId") as string;
  const dueDate = formData.get("dueDate") as string;

  if (!title) return { error: "Title is required" };

  const taskId = uuid();

  db.insert(schema.tasks).values({
    id: taskId,
    orgId: "demo-org-id",
    teamId: teamId || null,
    assigneeId: assigneeId || session.user.id,
    creatorId: session.user.id,
    title,
    description: description || null,
    priority: priority as "low" | "medium" | "high" | "urgent",
    dueDate: dueDate ? new Date(dueDate) : null,
  }).run();

  db.insert(schema.activityLogs).values({
    id: uuid(),
    orgId: "demo-org-id",
    userId: session.user.id,
    action: "task.created",
    entityType: "task",
    entityId: taskId,
    description: `Task "${title}" created`,
  }).run();

  revalidateTag(`tasks:demo-org-id`, 'max');
  revalidatePath("/overview", "page");
  revalidatePath("/dashboard", "page");

  return { success: true, taskId };
}

export async function updateTask(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

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

  db.update(schema.tasks)
    .set(updates)
    .where(eq(schema.tasks.id, taskId))
    .run();

  db.insert(schema.activityLogs).values({
    id: uuid(),
    orgId: "demo-org-id",
    userId: session.user.id,
    action: "task.updated",
    entityType: "task",
    entityId: taskId,
    description: `Task updated: ${status ? `status changed to ${status}` : title ? `title updated` : ""}`,
  }).run();

  revalidateTag(`tasks:demo-org-id`, 'max');
  revalidatePath("/overview", "page");
  revalidatePath("/dashboard", "page");

  return { success: true };
}

export async function deleteTask(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const taskId = formData.get("id") as string;
  if (!taskId) return { error: "Task ID is required" };

  db.delete(schema.tasks).where(eq(schema.tasks.id, taskId)).run();

  revalidateTag(`tasks:demo-org-id`, 'max');
  revalidatePath("/overview", "page");
  revalidatePath("/dashboard", "page");

  return { success: true };
}

export async function updateTaskStatus(taskId: string, status: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  db.update(schema.tasks)
    .set({ status: status as "todo" | "in_progress" | "review" | "done" | "cancelled", updatedAt: new Date() })
    .where(eq(schema.tasks.id, taskId))
    .run();

  revalidateTag(`tasks:demo-org-id`, 'max');
  return { success: true };
}
