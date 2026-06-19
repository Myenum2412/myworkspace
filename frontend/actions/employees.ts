"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth/config";

export async function addEmployeeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const department = formData.get("department") as string;
  const status = formData.get("status") as string;

  if (!name || !email) return { error: "Name and email are required" };

  const existing = await db.collection(collections.users).find({ email }).toArray();
  if (existing.length > 0) return { error: "User with this email already exists" };

  const orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
  if (!orgMember) return { error: "No organization found" };

  const userId = uuid();
  const defaultPassword = await hash("Welcome123", 12);

  await db.collection(collections.users).insertOne({
    id: userId,
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
    orgId: orgMember.orgId,
    userId,
    role: role?.toLowerCase() || "member",
  });

  revalidatePath("/employees");
  return { success: true };
}
