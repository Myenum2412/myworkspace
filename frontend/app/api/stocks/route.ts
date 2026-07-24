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
  if (!orgId) return NextResponse.json({ items: [] });
  try {
    const raw = await db.collection(collections.stocks).find({ orgId }).sort({ createdAt: -1 }).toArray();
    const items = (raw as any[]).map((s) => ({
      id: s.id || s._id?.toString() || "", name: s.name || "", category: s.category || "",
      quantity: s.quantity || 0, unit: s.unit || "", price: s.price || 0, status: s.status || "",
    }));
    return NextResponse.json({ initialStocks: items });
  } catch { return NextResponse.json({ items: [] }); }
}
