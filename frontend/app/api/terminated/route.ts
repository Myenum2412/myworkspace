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
  if (!orgId) return NextResponse.json({ employees: [] });
  try {
    const raw = await db.collection(collections.users).find({ orgId, status: "terminated" }).toArray();
    const employees = (raw as any[]).map((u) => ({
      id: u.id || u._id?.toString() || "", name: u.name || "", email: u.email || "",
      department: u.department || "", designation: u.designation || "", avatar: u.image || "",
    }));
    return NextResponse.json({ terminated: employees });
  } catch { return NextResponse.json({ employees: [] }); }
}
