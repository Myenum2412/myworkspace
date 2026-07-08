"use server";

import { hash } from "bcryptjs";
import { v4 as uuid } from "uuid";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "./config";
import { db } from "@/lib/db";
import { createUserWorkspace } from "@/actions/user-folder";

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

  const existingUser = await db.collection("users").findOne({ email });
  if (existingUser) {
    redirect("/signup-mongo?error=An account with this email already exists");
  }

  const existingClient = await db.collection("client_users").findOne({ email });
  if (existingClient) {
    redirect("/signup-mongo?error=An account with this email already exists");
  }

  const hashedPassword = await hash(password, 12);
  const userId = uuid();
  const orgId = uuid();

  const userDoc: Record<string, unknown> = {
    _id: userId,
    id: userId,
    orgId,
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

  const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const organizations = db.collection("organizations");
  const orgDoc: Record<string, unknown> = {
    _id: orgId,
    id: orgId,
    name: company || `${name}'s Organization`,
    slug: company?.toLowerCase().replace(/\s+/g, "-") || `org-${userId.slice(0, 8)}`,
    ownerId: userId,
    plan: "trial",
    trialEnd,
    subscriptionStatus: "trialing",
    onboardingCompleted: true,
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

  await createUserWorkspace(userId, name, orgId);

  const { sendWelcomeEmail } = await import("@/lib/mail");
  sendWelcomeEmail(email, name).catch((err) => {
    console.error("[AUTH] Welcome email failed:", err?.message || err);
  });

  await signIn("credentials", { email, password, redirect: false });
  console.log(`[AUTH] signupActionMongo: ${email} signed up → redirecting to /dashboard`);
  revalidatePath("/dashboard");
  revalidateTag('dashboard', 'max');
  redirect("/dashboard");
}
