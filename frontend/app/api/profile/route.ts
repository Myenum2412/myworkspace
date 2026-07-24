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
  try {
    const user = await db.collection(collections.users).findOne({ id: session.user.id }) as any;
    return NextResponse.json({
      data: user ? {
        id: user.id || user._id?.toString() || "", name: user.name || "", email: user.email || "",
        phone: user.phone || "", department: user.department || "", company: user.company || "",
        address: user.address || "", city: user.city || "", state: user.state || "",
        country: user.country || "", avatar: user.image || user.avatar || "",
        designation: user.designation || "", joiningDate: user.joiningDate || "",
      } : null, orgId: orgId || "",
    });
  } catch { return NextResponse.json({ data: null, orgId: "" }); }
}
