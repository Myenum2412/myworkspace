import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });

  try {
    const { otp } = await req.json();
    if (!otp || !/^\d{6}$/.test(otp)) return NextResponse.json({ error: "Valid 6-digit OTP required" }, { status: 400 });

    const oid = ObjectId.isValid(orgId) ? new ObjectId(orgId) : null;
    const query = oid ? { _id: oid } : { id: orgId };
    const org = await db.collection(collections.organizations).findOne(query) as any;

    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    if (org.emailOtp !== otp) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });

    if (new Date(org.emailOtpExpiry) < new Date()) return NextResponse.json({ error: "OTP expired" }, { status: 400 });

    await db.collection(collections.organizations).updateOne(query, {
      $set: { emailVerified: true },
      $unset: { emailOtp: "", emailOtpExpiry: "" },
    });

    return NextResponse.json({ success: true, message: "Email verified successfully" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Verification failed" }, { status: 500 });
  }
}
