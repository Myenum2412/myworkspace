"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth/config";
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

export async function createTask(formData: FormData) {
  let orgId: string;
  try { orgId = await requireOrgId(); } catch { return { error: "Unauthorized" }; }

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

  await db.collection(collections.tasks).insertOne({
    id: taskId,
    orgId,
    teamId: teamId || null,
    assigneeId: assigneeId || session.user.id,
    creatorId: session.user.id,
    title,
    description: description || null,
    priority: priority as "low" | "medium" | "high" | "urgent",
    dueDate: dueDate ? new Date(dueDate) : null,
  });

  await db.collection(collections.activityLogs).insertOne({
    id: uuid(),
    orgId,
    userId: session.user.id,
    action: "task.created",
    entityType: "task",
    entityId: taskId,
    description: `Task "${title}" created`,
  });

  revalidateTag(`tasks:${orgId}`, 'max');
  revalidateTag('dashboard', 'max');
  revalidatePath("/overview", "page");
  revalidatePath("/dashboard", "page");

  return { success: true, taskId };
}

export async function updateTask(formData: FormData) {
  let orgId: string;
  try { orgId = await requireOrgId(); } catch { return { error: "Unauthorized" }; }

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

  await db.collection(collections.tasks).updateOne(
    { id: taskId, orgId },
    { $set: updates }
  );

  await db.collection(collections.activityLogs).insertOne({
    id: uuid(),
    orgId,
    userId: session.user.id,
    action: "task.updated",
    entityType: "task",
    entityId: taskId,
    description: `Task updated: ${status ? `status changed to ${status}` : title ? `title updated` : ""}`,
  });

  revalidateTag(`tasks:${orgId}`, 'max');
  revalidateTag('dashboard', 'max');
  revalidatePath("/overview", "page");
  revalidatePath("/dashboard", "page");

  return { success: true };
}

export async function deleteTask(formData: FormData) {
  let orgId: string;
  try { orgId = await requireOrgId(); } catch { return { error: "Unauthorized" }; }

  const taskId = formData.get("id") as string;
  if (!taskId) return { error: "Task ID is required" };

  await db.collection(collections.tasks).deleteOne({ id: taskId, orgId });

  revalidateTag(`tasks:${orgId}`, 'max');
  revalidateTag('dashboard', 'max');
  revalidatePath("/overview", "page");
  revalidatePath("/dashboard", "page");

  return { success: true };
}

export async function updateTaskStatus(taskId: string, status: string) {
  let orgId: string;
  try { orgId = await requireOrgId(); } catch { return { error: "Unauthorized" }; }

  await db.collection(collections.tasks).updateOne(
    { id: taskId },
    { $set: { status: status as "todo" | "in_progress" | "review" | "done" | "cancelled", updatedAt: new Date() } }
  );

  revalidateTag(`tasks:${orgId}`, 'max');
  revalidateTag('dashboard', 'max');
  return { success: true };
}
