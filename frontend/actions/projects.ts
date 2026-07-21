"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth/config";
import { ROLES } from "@/lib/rbac";

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

  let orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
  if (!orgMember) {
    const user = await db.collection(collections.users).findOne({ id: session.user.id });
    const userName = user?.name || user?.email?.split("@")[0] || "User";
    const newOrgId = uuid();
    await db.collection(collections.organizations).insertOne({
      id: newOrgId,
      name: `${userName}'s Organization`,
      slug: userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${session.user.id.slice(0, 8)}`,
      plan: "free",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.collection(collections.orgMembers).insertOne({
      id: uuid(),
      orgId: newOrgId,
      userId: session.user.id,
      role: ROLES.MEMBERS,
      joinedAt: new Date(),
    });
    orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
  }
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

  let orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
  if (!orgMember) {
    const user = await db.collection(collections.users).findOne({ id: session.user.id });
    const userName = user?.name || user?.email?.split("@")[0] || "User";
    const newOrgId = uuid();
    await db.collection(collections.organizations).insertOne({
      id: newOrgId,
      name: `${userName}'s Organization`,
      slug: userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${session.user.id.slice(0, 8)}`,
      plan: "free",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.collection(collections.orgMembers).insertOne({
      id: uuid(),
      orgId: newOrgId,
      userId: session.user.id,
      role: ROLES.MEMBERS,
      joinedAt: new Date(),
    });
    orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
  }
  if (!orgMember) return { error: "No organization found" };

  const name = formData.get("name") as string;
  if (!name) return { error: "Name is required" };

  const projId = uuid();

  const doc: Record<string, unknown> = {
    id: projId,
    orgId: orgMember.orgId,
    name,
    client: (formData.get("client") as string) || "",
    color: (formData.get("color") as string) || "#3b82f6",
    description: (formData.get("description") as string) || "",
    deadline: (formData.get("deadline") as string) || null,
    access: ("Public" as const),
    status: ("Active" as const),
    health: (formData.get("health") as string) || "on-track",
    priority: (formData.get("priority") as string) || "medium",
    category: (formData.get("category") as string) || "",
    startDate: (formData.get("startDate") as string) || null,
    budget: Number(formData.get("budget")) || 0,
    spent: 0,
    tracked: 0,
    progress: 0,
    members: formData.getAll("members") as string[],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collections.projects).insertOne(doc);
  revalidatePath("/projects");
  revalidateTag('dashboard', 'max');
  return { success: true, data: doc };
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
  revalidateTag('dashboard', 'max');
  return { success: true };
}

export async function deleteProjectAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await db.collection(collections.projects).deleteOne({ id });
  revalidatePath("/projects");
  revalidateTag('dashboard', 'max');
  return { success: true };
}
