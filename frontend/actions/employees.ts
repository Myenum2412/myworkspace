"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth/config";
import { isAdminRole } from "@/lib/rbac";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function addEmployeeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const role = (session.user.role || "").toLowerCase();
  if (!isAdminRole(role)) return { error: "You do not have permission to create accounts" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const roleName = formData.get("role") as string;
  const department = formData.get("department") as string;
  const status = formData.get("status") as string;

  if (!name || !email) return { error: "Name and email are required" };

  try {
    // Account creation is authoritative in the backend. The orgId is derived
    // exclusively from the authenticated session; we never send it here.
    const cookieHeader = (await cookies()).toString();
    const res = await fetch(`${API_URL}/api/accounts/staffs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        name,
        email,
        role: roleName?.toLowerCase() || "staffs",
        department: department || undefined,
        status: status?.toLowerCase() || "active",
      }),
    });

    const body = await res.json().catch(() => ({ error: "Invalid response from server" }));

    if (!res.ok) {
      return { error: body.error || body.message || "Failed to create account" };
    }

    revalidatePath("/employees");
    revalidateTag("dashboard", "max");
    return { success: true, password: body.data?.tempPassword || "" };
  } catch (err: any) {
    console.error("[addEmployeeAction] Proxy error:", err);
    return { error: err.message || "Failed to create account" };
  }
}
