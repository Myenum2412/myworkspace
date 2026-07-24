import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ensureUserOrg } from "@/lib/org";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ doctors: [] });
  try {
    const raw = await db.collection(collections.doctors).find({ orgId }).sort({ doctorName: 1 }).toArray();
    const doctors = (raw as any[]).map((d) => ({
      id: d.id || "", orgId: d.orgId || "", doctorName: d.doctorName || "",
      specialization: d.specialization || "", department: d.department || "",
      consultationFee: d.consultationFee || 0, phone: d.phone || "", email: d.email || "",
      status: d.status || "active", createdAt: d.createdAt || "", updatedAt: d.updatedAt || "",
    }));
    return NextResponse.json({ doctors });
  } catch { return NextResponse.json({ doctors: [] }); }
}
