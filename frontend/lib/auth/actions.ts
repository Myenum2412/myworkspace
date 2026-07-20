"use server";

import { signIn, signOut } from "./config";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/rbac";
import { collections } from "@/lib/db/schema";
import { hash } from "bcryptjs";
import { v4 as uuid } from "uuid";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createUserWorkspace } from "@/actions/user-folder";
import { getNextSequence } from "@/lib/db/counter";

function getRedirectPath(role?: string): string {
  const r = role?.toLowerCase() || "";
  if (r === ROLES.ORG_ADMIN) return "/orgmenu";
  if (r === ROLES.CLIENTS) return "/client/dashboard";
  if (r === ROLES.MEMBERS) return "/dashboard";
  return "/staffs";
}

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=Email+and+password+are+required");
  }



  let user;
  let isClient = false;

  try {
    const apiUrl = process.env.API_URL || "http://localhost:4000";

    // Parallelize 2FA challenge check with DB lookups
    const [challengeRes, dbUser, clientUser] = await Promise.all([
      fetch(`${apiUrl}/api/two-factor/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).then(r => r.json()),
      db.collection(collections.users).findOne({ email }),
      db.collection(collections.clientUsers).findOne({ email }),
    ]);

    if (challengeRes?.data?.requiresTwoFactor) {
      redirect(`/login/verify-2fa?email=${encodeURIComponent(email)}`);
    }

    if (dbUser) {
      user = dbUser;
    } else if (clientUser) {
      user = clientUser;
      isClient = true;
    }

    if (!user) {
      redirect("/login?error=User+not+found");
    }
  } catch (err) {
    const isRedirect = err instanceof Error
      && "digest" in err
      && typeof (err as Error & { digest: string }).digest === "string"
      && (err as Error & { digest: string }).digest.startsWith("NEXT_REDIRECT");
    if (isRedirect) {
      throw err;
    }

    redirect("/login?error=Something+went+wrong.+Please+try+again.");
  }

  const userId = user!.id || user!._id?.toString();

  try {
    if (isClient) {
      // Parallelize client login writes
      await Promise.all([
        db.collection(collections.clientUsers).updateOne(
          { _id: user!._id },
          { $set: { lastLogin: new Date() } }
        ),
        db.collection(collections.clientAuditLogs).insertOne({
          orgId: user!.orgId,
          clientId: user!.clientId,
          clientUserId: userId,
          action: "client.login.success",
          entityType: "client_user",
          entityId: userId,
          description: `${user!.name} logged in`,
        }),
      ]);
    } else {
      // Parallelize user status update and member lookup
      const [member] = await Promise.all([
        db.collection(collections.orgMembers).findOne({ userId }),
        db.collection(collections.users).updateOne(
          { _id: user!._id },
          { $set: { status: "online", lastLogin: new Date(), updatedAt: new Date() } }
        ),
      ]);

      if (!member) {
        const userName = user!.name || email.split("@")[0];
        const newOrgId = uuid();
        let slug = userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId}`;

        const [existingSlug, existingOrg] = await Promise.all([
          db.collection(collections.organizations).findOne({ slug }),
          db.collection(collections.organizations).findOne({ ownerId: userId }),
        ]);

        if (existingSlug) slug = `${slug}-${userId}`;
        const orgIdToUse = existingOrg?.id || newOrgId;

        if (!existingOrg) {
          await db.collection(collections.organizations).updateOne(
            { slug },
            {
              $setOnInsert: {
                id: newOrgId, name: `${userName}'s Organization`, slug,
                plan: "free", ownerId: userId, onboardingCompleted: true,
                createdAt: new Date(), updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
        }

        await db.collection(collections.orgMembers).updateOne(
          { userId, orgId: orgIdToUse },
          {
            $setOnInsert: {
              id: uuid(), orgId: orgIdToUse, userId,
              role: ROLES.MEMBERS, joinedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      const orgId = member?.orgId || user!.orgId || "system";
      // Fire-and-forget activity log (non-critical)
      db.collection(collections.activityLogs).insertOne({
        id: uuid(), orgId, userId,
        action: "user.login", entityType: "user", entityId: userId,
        description: `${user!.name} logged in`,
      }).catch(() => {});
    }
  } catch (err) {

  }

  const role = isClient ? ROLES.CLIENTS : user?.role;
  const redirectPath = getRedirectPath(role);


  revalidatePath(redirectPath);
  revalidateTag('dashboard', 'max');

  try {
    await signIn("credentials", { email, password, redirect: true, redirectTo: redirectPath });
  } catch (err) {
    const isRedirect = err instanceof Error
      && "digest" in err
      && typeof (err as Error & { digest: string }).digest === "string"
      && (err as Error & { digest: string }).digest.startsWith("NEXT_REDIRECT");
    if (isRedirect) {
      throw err;
    }

    redirect("/login?error=Something+went+wrong.+Please+try+again.");
  }
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

  const [existingUser, existingClient] = await Promise.all([
    db.collection(collections.users).findOne({ email }),
    db.collection(collections.clientUsers).findOne({ email }),
  ]);
  if (existingUser || existingClient) {
    redirect("/signup?error=An+account+with+this+email+already+exists");
  }

  const hashedPassword = await hash(password, 12);
  const userId = uuid();
  const orgId = uuid();
  const userNumber = await getNextSequence("userNumber");

  await db.collection(collections.users).insertOne({
    id: userId,
    userNumber,
    name,
    email,
    password: hashedPassword,
    status: "online",
    role: ROLES.MEMBERS,
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

    const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    await db.collection(collections.organizations).insertOne({
    id: orgId,
    name: company || `${name}'s Organization`,
    slug,
    plan: "trial",
    trialEnd,
    subscriptionStatus: "trialing",
    ownerId: userId,
    onboardingCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.collection(collections.orgMembers).insertOne({
    id: uuid(),
    orgId,
    userId,
    role: ROLES.MEMBERS,
    joinedAt: new Date(),
  });

  await createUserWorkspace(userId, name, orgId);

  revalidatePath("/dashboard");
  revalidateTag('dashboard', 'max');
  try {
    await signIn("credentials", { email, password, redirect: true, redirectTo: "/dashboard" });
  } catch (err) {
    const isRedirect = err instanceof Error
      && "digest" in err
      && typeof (err as Error & { digest: string }).digest === "string"
      && (err as Error & { digest: string }).digest.startsWith("NEXT_REDIRECT");
    if (isRedirect) {
      throw err;
    }
    redirect("/dashboard");
  }
}

export async function sendSignupOtpAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const company = formData.get("company") as string;
  const plan = formData.get("selectedPlan") as string;

  if (!name || !email) {
    return { error: "Name and email are required" };
  }

  const apiUrl = process.env.API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/api/auth/send-signup-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, company, plan }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || data.message || "Failed to send verification code" };
    }
    return { success: true, email };
  } catch {
    return { error: "Unable to connect. Please try again." };
  }
}

export async function verifySignupOtpAction(formData: FormData) {
  const email = formData.get("email") as string;
  const otp = formData.get("otp") as string;

  if (!email || !otp) {
    return { error: "Email and verification code are required" };
  }

  const apiUrl = process.env.API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/api/auth/verify-signup-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || data.message || "Invalid verification code" };
    }

    const { password } = data.data!;

    try {
      await signIn("credentials", { email, password, redirect: true, redirectTo: "/dashboard" });
    } catch (err) {
      const isRedirect = err instanceof Error
        && "digest" in err
        && typeof (err as Error & { digest: string }).digest === "string"
        && (err as Error & { digest: string }).digest.startsWith("NEXT_REDIRECT");
      if (isRedirect) {
        throw err;
      }
      return { error: "Something went wrong. Please try signing in manually." };
    }
  } catch {
    return { error: "Unable to connect. Please try again." };
  }
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

  const apiUrl = process.env.API_URL || "http://localhost:4000";
  try {
    await fetch(`${apiUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {}
  redirect("/forgot-password?success=If an account exists with that email, a reset link has been sent");
}

export async function verifyEmailAction(formData: FormData) {
  const token = formData.get("token") as string;
  const email = formData.get("email") as string;
  if (!token || !email) redirect("/verify-email?error=Missing verification token or email");

  const apiUrl = process.env.API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email }),
    });
    if (!res.ok) {
      const err = await res.json();
      redirect(`/verify-email?error=${encodeURIComponent(err.error || "Verification failed")}`);
    }
  } catch {
    redirect("/verify-email?error=Unable to connect. Please try again.");
  }
  redirect("/login?verified=true");
}
