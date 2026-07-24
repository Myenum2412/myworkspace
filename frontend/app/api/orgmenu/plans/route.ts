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
  if (!orgId) return NextResponse.json({ plans: [], currentPlan: null });
  try {
    const [plansRaw, org] = await Promise.all([
      db.collection("plans").find({}).sort({ price: 1 }).toArray(),
      db.collection(collections.organizations).findOne({ id: orgId }) as any,
    ]);
    const plans = (plansRaw as any[]).map((p) => ({
      id: p.id || p._id?.toString() || "", name: p.name || "", price: p.price || 0,
      features: p.features || [], maxMembers: p.maxMembers || 0,
    }));
    return NextResponse.json({ plans, currentPlan: org?.plan || null });
  } catch { return NextResponse.json({ plans: [], currentPlan: null }); }
}
