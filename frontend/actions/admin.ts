"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { deleteFile } from "@/lib/storage";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN" && role !== "ORG_MENU_ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

type ActionResult = { error?: string; success?: boolean } | null;

// ─── Organization CRUD ────────────────────────────────────────────────

export async function updateOrganization(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try { await requireAdmin(); } catch { return { error: "Unauthorized" }; }

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const plan = formData.get("plan") as string;
  const domain = formData.get("domain") as string;
  const slug = formData.get("slug") as string;

  if (!id || !name) return { error: "ID and name are required" };

  try {
    await db.collection(collections.organizations).updateOne(
      { id },
      { $set: { name, plan: plan === "starter" ? "free" : plan === "pro" ? "growth" : plan || "free", domain: domain || null, slug: slug || null } },
    );
    revalidatePath("/orgmenu/org");
    revalidatePath("/orgmenu");
    revalidateTag('dashboard', 'max');
    return { success: true };
  } catch {
    return { error: "Failed to update organization" };
  }
}

export async function deleteOrganizationAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try { await requireAdmin(); } catch { return { error: "Unauthorized" }; }

  const id = formData.get("id") as string;
  if (!id) return { error: "ID is required" };

  try {
    await db.collection(collections.organizations).deleteOne({ id });
    await db.collection(collections.orgMembers).deleteMany({ orgId: id });
    revalidatePath("/orgmenu/org");
    revalidatePath("/orgmenu");
    revalidateTag('dashboard', 'max');
    return { success: true };
  } catch {
    return { error: "Failed to delete organization" };
  }
}

export async function deleteOrganization(formData: FormData): Promise<void> {
  try { await requireAdmin(); } catch { return; }

  const id = formData.get("id") as string;
  if (!id) return;

  try {
    await db.collection(collections.organizations).deleteOne({ id });
    await db.collection(collections.orgMembers).deleteMany({ orgId: id });
    revalidatePath("/orgmenu/org");
    revalidatePath("/orgmenu");
    revalidateTag('dashboard', 'max');
  } catch { /* ignore */ }
}

// ─── Cascade Deletion Helpers ────────────────────────────────────────

async function deleteUserFiles(userId: string): Promise<void> {
  const files = await db.collection(collections.fileAttachments).find({ uploaderId: userId }).toArray();

  for (const file of files) {
    try { await deleteFile(file.storagePath); } catch { /* ignore */ }

    const versions = await db.collection(collections.fileVersions).find({ fileId: file.id }).toArray();
    for (const v of versions) {
      try { await deleteFile(v.storagePath); } catch { /* ignore */ }
    }
    await db.collection(collections.fileVersions).deleteMany({ fileId: file.id });
    await db.collection(collections.fileShares).deleteMany({ fileId: file.id });
    await db.collection(collections.shareLinks).deleteMany({ fileId: file.id });
    await db.collection(collections.fileAttachments).deleteOne({ id: file.id });

    try {
      await db.collection(collections.storageQuotas).updateOne(
        { orgId: file.orgId },
        { $inc: { usedStorageBytes: -file.size } },
      );
    } catch { /* ignore */ }
  }

  await db.collection(collections.folders).deleteMany({ createdBy: userId });
}

// ─── Member / User CRUD ──────────────────────────────────────────────

export async function updateMember(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try { await requireAdmin(); } catch { return { error: "Unauthorized" }; }

  const userId = formData.get("userId") as string;
  if (!userId) return { error: "User ID is required" };

  const fields = ["name", "email", "phone", "location", "department", "designation", "role", "status"];
  const updateData: Record<string, unknown> = {};
  for (const f of fields) {
    const v = formData.get(f);
    if (v) updateData[f] = v;
  }

  try {
    await db.collection(collections.users).updateOne(
      { id: userId },
      { $set: updateData },
    );
    revalidatePath("/orgmenu/members");
    revalidatePath("/orgmenu");
    revalidateTag('dashboard', 'max');
    return { success: true };
  } catch {
    return { error: "Failed to update member" };
  }
}

export async function deleteMember(formData: FormData): Promise<void> {
  try { await requireAdmin(); } catch { return; }

  const userId = formData.get("userId") as string;
  const orgId = formData.get("orgId") as string;
  if (!userId) return;

  try {
    await deleteUserFiles(userId);
    await db.collection(collections.orgMembers).deleteOne({ userId, ...(orgId ? { orgId } : {}) });
    await db.collection(collections.users).deleteOne({ id: userId });
    revalidatePath("/orgmenu/members");
    revalidatePath("/orgmenu");
    revalidateTag('dashboard', 'max');
  } catch { /* ignore */ }
}

// ─── Dashboard: Recent Signup (User) CRUD ────────────────────────────

export async function updateRecentUser(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try { await requireAdmin(); } catch { return { error: "Unauthorized" }; }

  const userId = formData.get("userId") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const status = formData.get("status") as string;

  if (!userId) return { error: "User ID is required" };

  try {
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    await db.collection(collections.users).updateOne(
      { id: userId },
      { $set: updateData },
    );
    revalidatePath("/orgmenu");
    revalidateTag('dashboard', 'max');
    return { success: true };
  } catch {
    return { error: "Failed to update user" };
  }
}

export async function deleteRecentUser(formData: FormData): Promise<void> {
  try { await requireAdmin(); } catch { return; }

  const userId = formData.get("userId") as string;
  if (!userId) return;

  try {
    await deleteUserFiles(userId);
    await db.collection(collections.users).deleteOne({ id: userId });
    await db.collection(collections.orgMembers).deleteMany({ userId });
    revalidatePath("/orgmenu");
    revalidateTag('dashboard', 'max');
  } catch { /* ignore */ }
}
