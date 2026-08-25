import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { sendEmailDirect } from "@/lib/email";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ members: [] });
  try {
    const org = (await db.collection(collections.organizations).findOne({ id: orgId })) as any;
    const companyName = org?.name || "";

    const objectId = (() => {
      try {
        return new ObjectId(orgId);
      } catch {
        return null;
      }
    })();
    const userQuery = objectId
      ? { $or: [{ orgId }, { orgId: objectId }], role: { $ne: "clients" } }
      : { orgId, role: { $ne: "clients" } };
    const users = (await db.collection(collections.users).find(userQuery).toArray()) as any[];

    const members = users.map((u) => ({
      userId: u.id || u._id?.toString() || "",
      role: u.role || "staffs",
      name: u.name || "Unknown",
      email: u.email || "",
      avatar: u.image || "",
      status: u.status || "offline",
      companyName,
      phone: u.phone || "",
      department: u.department || "",
      designation: u.designation || "",
      employmentType: u.employmentType || "",
      branchName: u.branchName || "",
      joiningDate: u.joiningDate ? new Date(u.joiningDate).toISOString() : "",
      registeredAt: u.createdAt ? new Date(u.createdAt).toISOString() : "",
    }));

    return NextResponse.json({ members });
  } catch {
    return NextResponse.json({ members: [] });
  }
}

export async function DELETE(req: Request) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "No userId provided" }, { status: 400 });
    if (userId === session.user.id)
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
    if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });

    const orConditions: Record<string, unknown>[] = [{ id: userId }];
    if (ObjectId.isValid(userId)) orConditions.push({ _id: new ObjectId(userId) });
    const user = (await db.collection(collections.users).findOne({ $or: orConditions })) as any;

    const userDelete = user
      ? db.collection(collections.users).deleteOne(user.id ? { id: user.id } : { _id: user._id })
      : Promise.resolve();

    await Promise.all([
      db.collection(collections.orgMembers).deleteMany({ userId }),
      db.collection("orgmembers").deleteMany({ userId }),
      userDelete,
    ]);

    if (user?.email) {
      const org = (await db.collection(collections.organizations).findOne({ id: orgId })) as any;
      const companyName = org?.name || "MyWorkspace";
      const htmlBody = buildTerminationEmail(user.name || "User", companyName);
      sendEmailDirect(user.email, `Account Terminated - ${companyName}`, htmlBody).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}

function buildTerminationEmail(name: string, companyName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f4f5f7;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;background:#ef4444;color:#fff;width:48px;height:48px;border-radius:50%;line-height:48px;font-size:24px;">&times;</div>
      </div>
      <h1 style="color:#1a1a2e;font-size:24px;text-align:center;margin:0 0 8px;">Account Terminated</h1>
      <p style="color:#6b7280;font-size:14px;text-align:center;margin:0 0 32px;">${companyName}</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${name},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;">Your account for <strong>${companyName}</strong> has been terminated. You will no longer have access to the workspace.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:24px 0;">
        <p style="color:#991b1b;font-size:13px;margin:0;"><strong>Important:</strong> If you believe this was done in error, please contact your organization administrator.</p>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;">This is an automated message from ${companyName}.</p>
    </div>
  </div>
</body>
</html>`;
}
