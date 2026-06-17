"use server";

import { signIn, signOut } from "./config";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { v4 as uuid } from "uuid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbTx = any;

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

  const users = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .all();

  if (users.length > 0) {
    db.update(schema.users)
      .set({ status: "online", updatedAt: new Date() })
      .where(eq(schema.users.id, users[0].id))
      .run();

    db.insert(schema.activityLogs).values({
      id: uuid(),
      orgId: "demo-org-id",
      userId: users[0].id,
      action: "user.login",
      entityType: "user",
      entityId: users[0].id,
      description: `${users[0].name} logged in`,
    }).run();
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function signupAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const company = formData.get("company") as string;

  if (!name || !email || !password) {
    redirect("/signup?error=Name%2C+email%2C+and+password+are+required");
  }

  if (password.length < 8) {
    redirect("/signup?error=Password+must+be+at+least+8+characters");
  }

  const existing = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .all();

  if (existing.length > 0) {
    redirect("/signup?error=An+account+with+this+email+already+exists");
  }

  const hashedPassword = await hash(password, 12);
  const userId = uuid();
  const orgId = uuid();

  db.transaction((tx: DbTx) => {
    tx.insert(schema.users).values({
      id: userId,
      name,
      email,
      password: hashedPassword,
      status: "online",
      role: "admin",
    }).run();

    tx.insert(schema.organizations).values({
      id: orgId,
      name: company || `${name}'s Organization`,
      slug: company?.toLowerCase().replace(/\s+/g, "-") || `org-${userId.slice(0, 8)}`,
      plan: "starter",
    }).run();

    tx.insert(schema.orgMembers).values({
      id: uuid(),
      orgId,
      userId,
      role: "admin",
    }).run();
  });

  await signIn("credentials", { email, password, redirect: false });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function logoutAction() {
  const session = await import("./config").then(m => m.auth());
  if (session?.user?.id) {
    db.update(schema.users)
      .set({ status: "offline", updatedAt: new Date() })
      .where(eq(schema.users.id, session.user.id))
      .run();
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
