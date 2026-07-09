"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth/config";
import { getNextSequence, getNextEmployeeDisplayId } from "@/lib/db/counter";

export async function addEmployeeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const department = formData.get("department") as string;
  const status = formData.get("status") as string;

  if (!name || !email) return { error: "Name and email are required" };

  const existingUser = await (await db.collection(collections.users).find({ email })).toArray();
  if (existingUser.length > 0) return { error: "User with this email already exists" };

  const existingClient = await db.collection(collections.clientUsers).findOne({ email });
  if (existingClient) return { error: "User with this email already exists" };

  const orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
  if (!orgMember) {
    const user = await db.collection(collections.users).findOne({ id: session.user.id });
    const userName = user?.name || user?.email?.split("@")[0] || "User";
    const newOrgId = uuid();
    await db.collection(collections.organizations).insertOne({
      id: newOrgId,
      name: `${userName}'s Organization`,
      slug: userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${session.user.id.slice(0, 8)}`,
      plan: "free",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.collection(collections.orgMembers).insertOne({
      id: uuid(),
      orgId: newOrgId,
      userId: session.user.id,
      role: "admin",
      joinedAt: new Date(),
    });
  }

  const refreshedMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
  if (!refreshedMember) return { error: "No organization found" };

  const userId = uuid();
  const plainPassword = Math.random().toString(36).slice(-12) + "A1!";
  const defaultPassword = await hash(plainPassword, 12);
  const userNumber = await getNextSequence("userNumber");
  const displayId = await getNextEmployeeDisplayId(refreshedMember.orgId);

  await db.collection(collections.users).insertOne({
    id: userId,
    userNumber,
    displayId,
    name,
    email,
    password: defaultPassword,
    role: role?.toLowerCase() || "member",
    department,
    status: status?.toLowerCase() || "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.collection(collections.orgMembers).insertOne({
    id: uuid(),
    orgId: refreshedMember.orgId,
    userId,
    role: role?.toLowerCase() || "member",
  });

  const { sendEmailDirect, buildEmployeeOnboardedHtml } = await import("@/lib/email");
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;

  let emailStatus: "sent" | "failed" | "skipped" = "skipped";
  try {
    const htmlBody = buildEmployeeOnboardedHtml(name, email, "MyWorkspace", loginUrl, plainPassword);
    const subject = `Welcome to MyWorkspace - Your Account is Ready`;
    const emailResult = await sendEmailDirect(email, subject, htmlBody);
    emailStatus = emailResult.emailStatus;
  } catch (err: any) {
    console.error("[addEmployeeAction] Onboarded email failed:", err?.message || err);
    emailStatus = "failed";
  }

  const notificationsCol = db.collection(collections.notifications);
  const now = new Date();
  await notificationsCol.insertOne({
    id: uuid(),
    userId,
    orgId: refreshedMember.orgId,
    createdBy: session.user.id,
    type: "system",
    title: "Welcome to MyWorkspace!",
    message: "Your account has been created. You're now part of the organization.",
    link: "/employees",
    read: false,
    createdAt: now,
  });

  const adminMembers = await (await db.collection(collections.orgMembers).find({ orgId: refreshedMember.orgId, role: { $in: ["admin", "manager"] } })).toArray();
  const adminIds = [...new Set(adminMembers.map((m: any) => m.userId))].filter((id: string) => id !== userId);
  if (adminIds.length > 0) {
    const adminNotifs = adminIds.map((adminId: string) => ({
      id: uuid(),
      userId: adminId,
      orgId: refreshedMember.orgId,
      createdBy: session.user.id,
      type: "system",
      title: "New Employee Added",
      message: `${name} (${email}) has been added.`,
      link: "/employees",
      read: false,
      createdAt: now,
    }));
    await notificationsCol.insertMany(adminNotifs);
  }

  revalidatePath("/employees");
  revalidateTag('dashboard', 'max');
  return { success: true, password: plainPassword, emailStatus };
}
