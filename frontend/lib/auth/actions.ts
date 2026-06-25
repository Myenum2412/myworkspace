"use server";

import { signIn, signOut } from "./config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { hash } from "bcryptjs";
import { v4 as uuid } from "uuid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createUserWorkspace } from "@/actions/user-folder";

function getRedirectPath(role?: string): string {
  if (role === "ORG_MENU_ADMIN" || role === "SUPER_ADMIN") return "/orgmenu";
  return "/dashboard";
}

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=Email+and+password+are+required");
  }

  console.log(`[AUTH] loginAction: attempting signIn for ${email}`);

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    console.error(`[AUTH] loginAction: signIn failed for ${email}:`, err);
    redirect("/login?error=Invalid+email+or+password");
  }

  const user = await db.collection(collections.users).findOne({ email });
  if (!user) {
    console.error(`[AUTH] loginAction: user not found in DB after signIn: ${email}`);
    redirect("/login?error=User+not+found");
  }

  const userId = user.id || user._id?.toString();
  await db.collection(collections.users).updateOne(
    { _id: user._id },
    { $set: { status: "online", lastLogin: new Date(), updatedAt: new Date() } }
  );

  const member = await db.collection(collections.orgMembers).findOne({ userId: userId });

  // Auto-create org if user has none
  if (!member) {
    const userName = user.name || email.split("@")[0];
    const newOrgId = uuid();
    let slug = userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId}`;
    const existingSlug = await db.collection(collections.organizations).findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${userId}`;
    }

    const existingOrg = await db.collection(collections.organizations).findOne({ ownerId: userId });
    const orgIdToUse = existingOrg?.id || newOrgId;

    if (!existingOrg) {
      await db.collection(collections.organizations).updateOne(
        { slug },
        {
          $setOnInsert: {
            id: newOrgId,
            name: `${userName}'s Organization`,
            slug,
            plan: "starter",
            ownerId: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    const orgMemberExists = await db.collection(collections.orgMembers).findOne({ userId });
    if (!orgMemberExists) {
      await db.collection(collections.orgMembers).updateOne(
        { userId, orgId: orgIdToUse },
        {
          $setOnInsert: {
            id: uuid(),
            orgId: orgIdToUse,
            userId,
            role: "admin",
            joinedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
  }

  await db.collection(collections.activityLogs).insertOne({
    id: uuid(),
    orgId: member?.orgId || "system",
    userId,
    action: "user.login",
    entityType: "user",
    entityId: userId,
    description: `${user.name} logged in`,
  });

  const role = user?.role;
  const redirectPath = getRedirectPath(role);
  console.log(`[AUTH] loginAction: ${email} role=${role} → ${redirectPath}`);
  revalidatePath(redirectPath);
  redirect(redirectPath);
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

  const existing = await (await db.collection(collections.users).find({ email })).toArray();

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
    emailVerified: true,
    isActive: true,
    permissions: [],
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  let slug = company?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId.slice(0, 8)}`;
  const existingSlug = await db.collection(collections.organizations).findOne({ slug });
  if (existingSlug) {
    slug = `${slug}-${userId.slice(0, 8)}`;
  }

  await db.collection(collections.organizations).insertOne({
    id: orgId,
    name: company || `${name}'s Organization`,
    slug,
    plan: "starter",
    ownerId: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.collection(collections.orgMembers).insertOne({
    id: uuid(),
    orgId,
    userId,
    role: "admin",
    joinedAt: new Date(),
  });

  await createUserWorkspace(userId, name, orgId);

  await signIn("credentials", { email, password, redirect: false });
  const session = await import("./config").then(m => m.auth());
  const redirectPath = getRedirectPath(session?.user?.role);
  console.log(`[AUTH] signupAction: ${email} role=${session?.user?.role} → ${redirectPath}`);
  revalidatePath(redirectPath);
  redirect(redirectPath);
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
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) redirect("/forgot-password?error=Email is required");

  redirect("/forgot-password?success=If an account exists, a reset link has been sent");
}
