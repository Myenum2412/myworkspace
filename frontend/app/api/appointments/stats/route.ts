import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { ensureUserOrg } from "@/lib/org";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
    const today = new Date().toISOString().split("T")[0];

    const [total, todayCount, pending, confirmed, completed, cancelled] = await Promise.all([
      db.collection(collections.appointments).countDocuments({ orgId }),
      db.collection(collections.appointments).countDocuments({ orgId, appointmentDate: today }),
      db.collection(collections.appointments).countDocuments({ orgId, status: "Pending" }),
      db.collection(collections.appointments).countDocuments({ orgId, status: "Confirmed" }),
      db.collection(collections.appointments).countDocuments({ orgId, status: "Completed" }),
      db.collection(collections.appointments).countDocuments({ orgId, status: "Cancelled" }),
    ]);

    return NextResponse.json({
      success: true,
      data: { total, today: todayCount, pending, confirmed, completed, cancelled },
    });
  } catch (err: any) {
    console.error("[API /api/appointments/stats] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
