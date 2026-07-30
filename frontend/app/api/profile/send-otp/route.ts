import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { sendEmailDirect } from "@/lib/email";
import { ObjectId } from "mongodb";

export async function POST() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });

  try {
    const user = await db.collection(collections.users).findOne({ id: session.user.id }) as any;
    const email = user?.email || session.user.email;
    if (!email) return NextResponse.json({ error: "No email on file" }, { status: 400 });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    const oid = ObjectId.isValid(orgId) ? new ObjectId(orgId) : null;
    const query = oid ? { _id: oid } : { id: orgId };
    await db.collection(collections.organizations).updateOne(query, {
      $set: { emailOtp: otp, emailOtpExpiry: expiry.toISOString() },
    });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;padding:40px;">
  <div style="max-width:480px;margin:0 auto;">
    <h2>Email Verification</h2>
    <p>Your OTP for email verification is:</p>
    <div style="font-size:32px;font-weight:700;letter-spacing:6px;text-align:center;padding:20px;background:#f3f4f6;border-radius:8px;margin:20px 0;">${otp}</div>
    <p style="color:#6b7280;font-size:14px;">This OTP is valid for 10 minutes.</p>
  </div>
</body>
</html>`;

    await sendEmailDirect(email, "Email Verification OTP", html);

    return NextResponse.json({ success: true, message: "OTP sent to your email" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to send OTP" }, { status: 500 });
  }
}
