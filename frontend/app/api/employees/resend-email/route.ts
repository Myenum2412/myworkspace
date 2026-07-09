import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { hash } from "bcryptjs";
import { sendEmailDirect, buildEmployeeOnboardedHtml } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role?.toLowerCase() || "";
    const isWorkspaceAdmin = ["workspace", "admin", "manager", "org_menu_admin", "super_admin"].includes(role);
    if (!isWorkspaceAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const employee = await db.collection(collections.users).findOne({ id: userId });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const firstName = (employee.name as string)?.split(" ")[0] || employee.name;
    const workspaceName = "MyWorkspace";
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;

    // Generate a new temporary password and update the user record
    const newTempPassword = Math.random().toString(36).slice(-8) + "A1!";
    const hashedPassword = await hash(newTempPassword, 12);

    await db.collection(collections.users).updateOne(
      { id: userId },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    const htmlBody = buildEmployeeOnboardedHtml(firstName, employee.email as string, workspaceName, loginUrl, newTempPassword);
    const subject = `Welcome to ${workspaceName} - Your Account is Ready`;
    const result = await sendEmailDirect(employee.email as string, subject, htmlBody);

    return NextResponse.json({
      success: result.success,
      emailStatus: result.emailStatus,
      error: result.error,
      message: result.success ? "Resend email sent successfully" : "Failed to resend email",
      newTempPassword: result.success ? newTempPassword : undefined,
    });
  } catch (err: any) {
    console.error("Resend email error:", err);
    return NextResponse.json({ error: err.message || "Failed to resend email" }, { status: 500 });
  }
}
