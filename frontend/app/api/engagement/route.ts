import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ObjectId } from "mongodb";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ engagements: [] });
  try {
    const raw = await db.collection(collections.engagements).find({ orgId }).sort({ createdAt: -1 }).limit(100).toArray();
    const engagements = (raw as any[]).map((e) => ({
      id: e.id ?? (e._id instanceof ObjectId ? e._id.toString() : String(e._id ?? "")),
      date: e.date || "", customerName: e.customerName || "", contact: e.contact || "",
      source: e.source || "", status: e.status || "", assignedTo: e.assignedTo || "",
      followUpDate: e.followUpDate || "", remarks: e.remarks || "",
    }));
    return NextResponse.json({ engagements });
  } catch { return NextResponse.json({ engagements: [] }); }
}
