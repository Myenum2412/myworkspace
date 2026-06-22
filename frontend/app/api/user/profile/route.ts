import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role;

  try {
    // Get user record
    const user = await db.collection(collections.users).findOne(
      { id: userId },
      { projection: { id: 1, name: 1, email: 1, status: 1, role: 1, image: 1, bannerUrl: 1, createdAt: 1 } }
    );

    // Super admin sees all orgs; others see their own org
    let orgId: string | null = null;
    let org: Record<string, unknown> | null = null;
    let memberCount = 0;

    if (role === "SUPER_ADMIN") {
      // Super admin: pick first org for display, but show aggregate counts
      const firstOrg = await db.collection(collections.organizations).findOne({});
      if (firstOrg) {
        orgId = firstOrg.id as string;
        org = firstOrg;
      }
      memberCount = await db.collection(collections.orgMembers).countDocuments({});
    } else {
      orgId = await getUserOrgId(userId);
      if (orgId) {
        org = await db.collection(collections.organizations).findOne({ id: orgId });
        memberCount = await db.collection(collections.orgMembers).countDocuments({ orgId });
      }
    }

    return NextResponse.json({
      data: {
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status || "offline",
          role: user.role || "member",
          image: user.image || "",
          bannerUrl: user.bannerUrl || "",
          createdAt: user.createdAt,
        } : null,
        org: org ? {
          id: org.id,
          name: org.name,
          domain: org.domain || "",
          plan: org.plan || "starter",
          createdAt: org.createdAt,
        } : null,
        memberCount,
      },
    });
  } catch (e) {
    console.error("Failed to fetch profile:", e);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
