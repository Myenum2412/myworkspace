"use server";

import { hash } from "bcryptjs";
import { v4 as uuid } from "uuid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "./config";
import { db } from "@/lib/db";

export async function signupActionMongo(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const company = formData.get("company") as string;

  if (!name || !email || !password) {
    redirect("/signup-mongo?error=Name, email, and password are required");
  }

  if (password.length < 8) {
    redirect("/signup-mongo?error=Password must be at least 8 characters");
  }

  const existing = await db.collection("users").findOne({ email });
  if (existing) {
    redirect("/signup-mongo?error=An account with this email already exists");
  }

  const hashedPassword = await hash(password, 12);
  const userId = uuid();
  const orgId = uuid();

  const userDoc: Record<string, unknown> = {
    _id: userId,
    id: userId,
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
  await db.collection("users").insertOne(userDoc as never);

  const organizations = db.collection("organizations");
  const orgDoc: Record<string, unknown> = {
    _id: orgId,
    id: orgId,
    name: company || `${name}'s Organization`,
    slug: company?.toLowerCase().replace(/\s+/g, "-") || `org-${userId.slice(0, 8)}`,
    ownerId: userId,
    plan: "starter",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await organizations.insertOne(orgDoc as never);

  await db.collection("org_members").insertOne({
    id: uuid(),
    orgId,
    userId,
    role: "admin",
    joinedAt: new Date(),
  });

  await signIn("credentials", { email, password, redirect: false });
  const createdUser = await db.collection("users").findOne({ email });
  const role = createdUser?.role;
  const redirectPath = role === "ORG_MENU_ADMIN" || role === "SUPER_ADMIN" ? "/orgmenu" : "/dashboard";
  console.log(`[AUTH] signupActionMongo: ${email} role=${role} → ${redirectPath}`);
  revalidatePath(redirectPath);
  redirect(redirectPath);
}
