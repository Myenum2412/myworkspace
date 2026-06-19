"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth/config";

export type ProjectData = {
  id: string;
  name: string;
  client: string;
  color: string;
  tracked: number;
  progress: number;
  access: "Public" | "Private";
  status: "Active" | "Inactive";
};

export async function getProjects() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
  if (!orgMember) return [];

  const projects = await db
    .collection(collections.projects)
    .find({ orgId: orgMember.orgId })
    .sort({ createdAt: -1 })
    .toArray();

  return projects.map((p) => {
    const { _id, ...rest } = p as Record<string, unknown>;
    void _id;
    return rest as ProjectData;
  });
}

export async function createProjectAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
  if (!orgMember) return { error: "No organization found" };

  const name = formData.get("name") as string;
  if (!name) return { error: "Name is required" };

  const doc = {
    id: uuid(),
    orgId: orgMember.orgId,
    name,
    client: (formData.get("client") as string) || "",
    color: (formData.get("color") as string) || "#3b82f6",
    tracked: 0,
    progress: 0,
    access: "Public" as const,
    status: "Active" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collections.projects).insertOne(doc);
  revalidatePath("/projects");
  return { success: true };
}

export async function updateProjectAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const update: Record<string, string | Date> = { updatedAt: new Date() };
  const fields = ["name", "client", "color", "access", "status"];
  for (const f of fields) {
    const val = formData.get(f);
    if (val) update[f] = val as string;
  }

  await db.collection(collections.projects).updateOne({ id }, { $set: update });
  revalidatePath("/projects");
  return { success: true };
}

export async function deleteProjectAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await db.collection(collections.projects).deleteOne({ id });
  revalidatePath("/projects");
  return { success: true };
}
