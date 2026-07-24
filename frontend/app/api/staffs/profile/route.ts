import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET(req: Request) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const userId = url.searchParams.get("id") || session.user.id;
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ profile: null });
  try {
    const user = await db.collection(collections.users).findOne({ id: userId }) as any;
    return NextResponse.json({
      profile: user ? {
        id: user.id || user._id?.toString() || "", name: user.name || "", email: user.email || "",
        phone: user.phone || "", department: user.department || "", designation: user.designation || "",
        avatar: user.image || user.avatar || "", status: user.status || "offline",
      } : null,
    });
  } catch { return NextResponse.json({ profile: null }); }
}
