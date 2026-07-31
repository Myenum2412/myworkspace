import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ObjectId } from "mongodb";

const deptColors = ["bg-red-500","bg-red-500","bg-red-500","bg-red-500","bg-red-500","bg-red-500","bg-red-500","bg-red-500"];

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ departments: [], totalMembers: 0, totalOpen: 0 });
  try {
    const [deptData, members] = await Promise.all([
      db.collection(collections.departments).find({ orgId }).toArray(),
      db.collection(collections.orgMembers).find({ orgId }).toArray(),
    ]);
    const userIds = (members as any[]).map((m) => m.userId).filter(Boolean);
    const usersData = userIds.length > 0 ? await db.collection(collections.users).find({ id: { $in: userIds } }).project({ id: 1, name: 1, image: 1 }).toArray() : [];
    const userMap = new Map((usersData as any[]).map((u) => [u.id, u]));
    const departments = (deptData as any[]).map((d, i) => {
      const headUser = d.headId ? userMap.get(d.headId) : undefined;
      return {
        name: d.name || "Unknown", head: headUser?.name || "Unassigned", headAvatar: headUser?.image || "",
        memberCount: d.memberCount || (members as any[]).length, openPositions: 0, budget: "$0", color: deptColors[i % deptColors.length],
      };
    });
    const totalMembers = departments.reduce((s: number, d: any) => s + d.memberCount, 0);
    return NextResponse.json({ departments, totalMembers, totalOpen: 0 });
  } catch { return NextResponse.json({ departments: [], totalMembers: 0, totalOpen: 0 }); }
}
