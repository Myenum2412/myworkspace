"use server";

import { signIn } from "./config";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { BootstrapData } from "@/lib/api/bootstrap";
import { ROLES } from "@/lib/rbac";

function getRedirectPath(role?: string): string {
  const r = role?.toLowerCase() || "";
  if (r === ROLES.ORG_ADMIN) return "/orgmenu";
  if (r === ROLES.CLIENTS) return "/client/dashboard";
  if (r === ROLES.MEMBERS) return "/dashboard";
  if (r === ROLES.STAFFS || r === ROLES.TEAM_STAFF) return "/staffs";
  return "/dashboard";
}

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
      return { success: false, error: signInResult?.error || "Invalid credentials" };
    }

    const user = signInResult as unknown as { ok: boolean; url?: string; error?: string };
    if (!user.ok) {
      return { success: false, error: user.error || "Authentication failed" };
    }

    const sessionToken = signInResult as unknown as { token?: string };

    const apiUrl = process.env.API_URL || "http://localhost:4000";
    const sessionRes = await fetch(`${apiUrl}/api/bootstrap`, {
      headers: {
        Cookie: `authjs.session-token=${sessionToken.token || ""}`,
      },
    });
    const bootstrapJson = await sessionRes.json();
    const bootstrapData = bootstrapJson.data || bootstrapJson;

    const role = bootstrapData?.user?.role;
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
