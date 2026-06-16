"use server";

import { hash } from "bcryptjs";
import { v4 as uuid } from "uuid";
import { revalidatePath } from "next/cache";
import { mongo } from "@/lib/db/mongodb";

export async function signupActionMongo(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const company = formData.get("company") as string;

    if (!name || !email || !password) {
      return { error: "Name, email, and password are required" };
    }

    if (password.length < 8) {
      return { error: "Password must be at least 8 characters" };
    }

    const users = mongo.collection("users");
    const organizations = mongo.collection("organizations");

    const existing = await users.findOne({ email });
    if (existing) {
      return { error: "An account with this email already exists" };
    }

    const hashedPassword = await hash(password, 12);
    const userId = uuid();
    const orgId = uuid();

    const userDoc: Record<string, unknown> = {
      _id: userId,
      name,
      email,
      password: hashedPassword,
      company: company || null,
      status: "online",
      role: "admin",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await users.insertOne(userDoc as never);

    const orgDoc: Record<string, unknown> = {
      _id: orgId,
      name: company || `${name}'s Organization`,
      slug: company?.toLowerCase().replace(/\s+/g, "-") || `org-${userId.slice(0, 8)}`,
      ownerId: userId,
      plan: "starter",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await organizations.insertOne(orgDoc as never);

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Failed to create account" };
  }
}
