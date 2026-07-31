"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "./config";
import { createUserWorkspace } from "@/actions/user-folder";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

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

  // Account + organization creation is authoritative in the backend
  // (POST /api/auth/signup). It validates password strength, checks
  // duplicates across both account stores, and creates the company-owner
  // (members) account + organization in a transaction.
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, company: company || undefined }),
    });
  } catch (err: any) {
    console.error("[AUTH] Backend signup unavailable:", err);
    redirect("/signup-mongo?error=Signup service is temporarily unavailable");
  }

  const body = await res.json().catch(() => ({ error: "Invalid response from server" }));

  if (!res.ok) {
    redirect(`/signup-mongo?error=${encodeURIComponent(body.error || body.message || "Signup failed")}`);
  }

  const userId = body.data?.user?.id as string | undefined;
  const orgId = body.data?.orgId as string | undefined;

  if (userId && orgId) {
    await createUserWorkspace(userId, name, orgId);
  }

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
