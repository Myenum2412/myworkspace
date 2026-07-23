"use server";

import { signIn, auth } from "./config";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { BootstrapData } from "@/lib/api/bootstrap";
import { ROLES } from "@/lib/rbac";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

function getRedirectPath(role?: string): string {
  const r = role?.toLowerCase() || "";
  if (r === ROLES.ORG_ADMIN) return "/orgmenu";
  if (r === ROLES.CLIENTS) return "/client/dashboard";
  if (r === ROLES.MEMBERS) return "/dashboard";
  if (r === ROLES.STAFFS || r === ROLES.TEAM_STAFF) return "/staffs";
  return "/dashboard";
}

const AUTH_ERRORS: Record<string, string> = {
  CredentialsSignin: "Invalid email or password. Please try again.",
  OAuthSignin: "There was a problem signing in with this provider.",
  OAuthCallback: "There was a problem signing in with this provider.",
  OAuthCreateAccount: "Could not create an account with this provider.",
  EmailCreateAccount: "Could not create an account with this email.",
  Callback: "There was a problem signing in.",
  OAuthAccountNotLinked: "This email is already associated with another account.",
  EmailSignin: "There was a problem sending the verification email.",
  SessionRequired: "Please sign in to access this page.",
  Configuration: "Server configuration error. Please contact support.",
  AccessDenied: "Access denied. You don't have permission to access this resource.",
};

export async function instantLoginAction(email: string, password: string): Promise<{
  success: boolean;
  error?: string;
  redirectTo?: string;
  bootstrapData?: BootstrapData;
}> {
  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  try {
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!signInResult || signInResult.error) {
      return { success: false, error: AUTH_ERRORS[signInResult?.error || ""] || signInResult?.error || "Invalid email or password. Please try again." };
    }

    const user = signInResult as unknown as { ok: boolean; url?: string; error?: string };
    if (!user.ok) {
      return { success: false, error: AUTH_ERRORS[user.error || ""] || user.error || "Authentication failed" };
    }

    const session = await auth();

    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, error: "Authentication succeeded but session not found" };
    }

    const role = session.user.role || "staffs";
    const orgId = session.user.orgId || "";
    const [userDoc, orgDoc] = await Promise.all([
      db.collection(collections.users).findOne({ id: userId }).catch(() => null),
      orgId ? db.collection(collections.organizations).findOne({ id: orgId }).catch(() => null) : Promise.resolve(null),
    ]);

    const org = orgDoc as Record<string, unknown> | null;
    const bootstrapData: BootstrapData = {
      user: {
        id: userId,
        name: userDoc?.name || session.user.name || "",
        email: userDoc?.email || session.user.email || "",
        image: userDoc?.image || session.user.image || "",
        role,
        permissions: session.user.permissions || [],
        status: userDoc?.status || "online",
        lastLogin: userDoc?.lastLogin ? new Date(userDoc.lastLogin).toISOString() : null,
        createdAt: userDoc?.createdAt ? new Date(userDoc.createdAt).toISOString() : null,
      },
      organization: org
        ? {
            id: org.id as string,
            name: org.name as string,
            slug: org.slug as string,
            plan: (org.plan as string) || "trial",
            trialEnd: org.trialEnd ? new Date(org.trialEnd as string).toISOString() : null,
            ownerId: org.ownerId as string,
            onboardingCompleted: org.onboardingCompleted === true,
          }
        : null,
      orgId,
      notifications: { unreadCount: 0 },
      members: [],
      recentSessions: [],
      navigation: { role, orgId },
    };

    const redirectTo = getRedirectPath(role);

    revalidatePath(redirectTo, "page");
    revalidateTag("dashboard", "max");

    return {
      success: true,
      redirectTo,
      bootstrapData,
    };
  } catch (err) {
    console.error("[INSTANT_LOGIN] Error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
