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
  if (!orgId) return NextResponse.json({ data: [] });
  try {
    const services = await db.collection(collections.services).find({ orgId }).sort({ name: 1 }).toArray();
    const data = (services as any[]).map((s) => ({
      id: s.id || s._id?.toString() || "",
      name: s.name || "",
      description: s.description || "",
      rate: s.rate || 0,
      unit: s.unit || "",
      category: s.category || "",
      status: s.status || "Active",
    }));
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
