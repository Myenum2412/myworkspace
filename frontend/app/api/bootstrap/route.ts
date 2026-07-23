import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const orgId = session.user.orgId || "";
    const role = session.user.role || "staffs";

    const [userDoc, orgDoc, notificationCount] = await Promise.all([
      db.collection(collections.users).findOne({ id: userId }).catch(() => null),
      orgId ? db.collection(collections.organizations).findOne({ id: orgId }).catch(() => null) : Promise.resolve(null),
      db.collection(collections.notifications).countDocuments({ userId, read: false }).catch(() => 0),
    ]);

    const memberDocs = orgId
      ? await db.collection(collections.orgMembers).find({ orgId }).toArray().catch(() => [])
      : [];

    const userIds = memberDocs.map((m: any) => m.userId).filter(Boolean);
    let members: any[] = [];
    if (userIds.length > 0) {
      const users = await db.collection(collections.users).find({ id: { $in: userIds } }).toArray().catch(() => []);
      const userMap = new Map(users.map((u: any) => [u.id, u]));
      members = memberDocs.map((m: any) => ({
        role: m.role,
        ...(userMap.get(m.userId) || {}),
      }));
    }

    const org = orgDoc as Record<string, unknown> | null;

    const data = {
      user: {
        id: userId,
        name: userDoc?.name || session.user.name || "",
        email: userDoc?.email || session.user.email || "",
        image: userDoc?.image || session.user.image || "",
        role,
        permissions: session.user.permissions || [],
        status: userDoc?.status || "online",
        lastLogin: userDoc?.lastLogin ? new Date(userDoc.lastLogin).toISOString() : null,
        createdAt: userDoc?.createdAt ? new Date(userDoc.createdAt).toISOString() : null,
      },
      organization: org
        ? {
            id: org.id as string,
            name: org.name as string,
            slug: org.slug as string,
            plan: (org.plan as string) || "trial",
            trialEnd: org.trialEnd ? new Date(org.trialEnd as string).toISOString() : null,
            ownerId: org.ownerId as string,
            onboardingCompleted: org.onboardingCompleted === true,
          }
        : null,
      orgId,
      notifications: { unreadCount: notificationCount },
      members,
      recentSessions: [],
      navigation: { role, orgId },
    };

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[BOOTSTRAP] Error:", err);
    return NextResponse.json({ success: false, error: "Bootstrap failed" }, { status: 500 });
  }
}
