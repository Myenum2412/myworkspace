"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth/config";
import { getNextSequence, getNextEmployeeDisplayId } from "@/lib/db/counter";

export async function addEmployeeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const department = formData.get("department") as string;
  const status = formData.get("status") as string;

  if (!name || !email) return { error: "Name and email are required" };

  const existing = await (await db.collection(collections.users).find({ email })).toArray();
  if (existing.length > 0) return { error: "User with this email already exists" };

  const orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
  if (!orgMember) {
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
  }

  const refreshedMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
  if (!refreshedMember) return { error: "No organization found" };

  const userId = uuid();
  const defaultPassword = await hash(Math.random().toString(36).slice(-12) + "A1!", 12);
  const userNumber = await getNextSequence("userNumber");
  const displayId = await getNextEmployeeDisplayId(refreshedMember.orgId);

  await db.collection(collections.users).insertOne({
    id: userId,
    userNumber,
    displayId,
    name,
    email,
    password: defaultPassword,
    role: role?.toLowerCase() || "member",
    department,
    status: status?.toLowerCase() || "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.collection(collections.orgMembers).insertOne({
    id: uuid(),
    orgId: refreshedMember.orgId,
    userId,
    role: role?.toLowerCase() || "member",
  });

  revalidatePath("/employees");
  return { success: true };
}
