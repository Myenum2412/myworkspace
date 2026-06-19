"use server";

import { signIn, signOut } from "./config";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { hash } from "bcryptjs";
import { v4 as uuid } from "uuid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=Email+and+password+are+required");
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=Invalid+email+or+password");
    }
    throw error;
  }

  const users = await db.collection(collections.users).find({ email }).toArray();

  if (users.length > 0) {
    await db.collection(collections.users).updateOne(
      { id: users[0].id },
      { $set: { status: "online", updatedAt: new Date() } }
    );

    const member = await db.collection(collections.orgMembers).findOne({ userId: users[0].id });

    await db.collection(collections.activityLogs).insertOne({
      id: uuid(),
      orgId: member?.orgId || "system",
      userId: users[0].id,
      action: "user.login",
      entityType: "user",
      entityId: users[0].id,
      description: `${users[0].name} logged in`,
    });
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function signupAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;
  const company = formData.get("company") as string;

  if (!name || !email || !password) {
    redirect("/signup?error=Name%2C+email%2C+and+password+are+required");
  }

  if (password.length < 8) {
    redirect("/signup?error=Password+must+be+at+least+8+characters");
  }

  if (password !== confirm) {
    redirect("/signup?error=Passwords+do+not+match");
  }

  const existing = await db.collection(collections.users).find({ email }).toArray();

  if (existing.length > 0) {
    redirect("/signup?error=An+account+with+this+email+already+exists");
  }

  const hashedPassword = await hash(password, 12);
  const userId = uuid();
  const orgId = uuid();

  await db.collection(collections.users).insertOne({
    id: userId,
    name,
    email,
    password: hashedPassword,
    status: "online",
    role: "admin",
  });

  await db.collection(collections.organizations).insertOne({
    id: orgId,
    name: company || `${name}'s Organization`,
    slug: company?.toLowerCase().replace(/\s+/g, "-") || `org-${userId.slice(0, 8)}`,
    plan: "starter",
  });

  await db.collection(collections.orgMembers).insertOne({
    id: uuid(),
    orgId,
    userId,
    role: "admin",
  });

  await signIn("credentials", { email, password, redirect: false });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function logoutAction() {
  const session = await import("./config").then(m => m.auth());
  if (session?.user?.id) {
    await db.collection(collections.users).updateOne(
      { id: session.user.id },
      { $set: { status: "offline", updatedAt: new Date() } }
    );
  }
  await signOut({ redirect: false });
  revalidatePath("/login");
  redirect("/login");
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) redirect("/forgot-password?error=Email is required");

  redirect("/forgot-password?success=If an account exists, a reset link has been sent");
}
