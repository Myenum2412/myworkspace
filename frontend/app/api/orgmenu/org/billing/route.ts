import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ invoices: [] });
  try {
    const raw = await db.collection(collections.invoices).find({ orgId }).sort({ createdAt: -1 }).toArray();
    const invoices = (raw as any[]).map((i) => ({
      id: i.id || i._id?.toString() || "", number: i.number || "", amountPaid: i.amountPaid || 0,
      currency: i.currency || "inr", status: i.status || "", customerName: i.customerName || "",
      createdAt: i.createdAt ? new Date(i.createdAt).toISOString() : "",
    }));
    return NextResponse.json({ invoices });
  } catch { return NextResponse.json({ invoices: [] }); }
}
