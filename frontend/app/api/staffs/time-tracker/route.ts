import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET(req: Request) {
  let session: Session | null;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ members: [], summary: null });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  try {
    const [memberDocs, entryRaw] = await Promise.all([
      db.collection(collections.orgMembers).find({ orgId }).toArray(),
      db.collection(collections.timeEntries).find({ orgId, date }).toArray(),
    ]);

    const userIds = (memberDocs as any[]).map((m) => m.userId).filter(Boolean);
    let users: any[] = [];
    if (userIds.length > 0) {
      users = (await db
        .collection(collections.users)
        .find({ id: { $in: userIds } })
        .toArray()) as any[];
    }
    const userMap = new Map(users.map((u) => [u.id, u]));

    const byUser = new Map<
      string,
      { totalMinutes: number; entryCount: number; pending: number; approved: number }
    >();
    for (const e of entryRaw as any[]) {
      const userId = e.userId || "";
      if (!userId) continue;
      const cur = byUser.get(userId) || { totalMinutes: 0, entryCount: 0, pending: 0, approved: 0 };
      cur.totalMinutes += Number(e.duration) || 0;
      cur.entryCount += 1;
      if (e.status === "pending") cur.pending += 1;
      if (e.status === "approved") cur.approved += 1;
      byUser.set(userId, cur);
    }

    const members = (memberDocs as any[]).map((m) => {
      const u = userMap.get(m.userId) || ({} as any);
      const agg = byUser.get(m.userId) || {
        totalMinutes: 0,
        entryCount: 0,
        pending: 0,
        approved: 0,
      };
      const totalMinutes = agg.totalMinutes;
      return {
        userId: m.userId,
        name: u.name || m.name || "",
        email: u.email || "",
        avatar: u.image || "",
        status: u.status || "offline",
        department: u.department || "",
        designation: u.designation || "",
        role: m.role || "staffs",
        totalMinutes,
        totalHours: (totalMinutes / 60).toFixed(1),
        entryCount: agg.entryCount,
        pendingEntries: agg.pending,
        approvedEntries: agg.approved,
      };
    });

    const totalMinutesAll = members.reduce((s, m) => s + m.totalMinutes, 0);
    const activeMembers = members.filter((m) => m.entryCount > 0).length;
    const summary = {
      totalMembers: members.length,
      activeMembers,
      totalHoursAll: (totalMinutesAll / 60).toFixed(1),
      totalEntries: members.reduce((s, m) => s + m.entryCount, 0),
    };

    return NextResponse.json({ members, summary, date });
  } catch {
    return NextResponse.json({ members: [], summary: null });
  }
}
