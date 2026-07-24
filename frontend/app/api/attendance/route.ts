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
  if (!orgId) return NextResponse.json({ today: [] });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [fromNextAuth, fromMongoose] = await Promise.all([
      db.collection(collections.orgMembers).find({ orgId }).toArray(),
      db.collection("orgmembers").find({ orgId, date: today }).toArray(),
    ]);
    const memberUserIds = (fromNextAuth as any[]).map((m) => m.userId).filter(Boolean);
    const users = memberUserIds.length > 0 ? await db.collection(collections.users).find({ id: { $in: memberUserIds } }).toArray() : [];
    const userMap = new Map((users as any[]).map((u) => [u.id, u]));
    const attendanceMap = new Map((fromMongoose as any[]).map((a: any) => [a.userId || a.employeeId, a]));
    const todayData = (fromNextAuth as any[]).map((m) => {
      const u = userMap.get(m.userId) || {} as any;
      const a = attendanceMap.get(m.userId) || {} as any;
      return {
        name: u.name || "Unknown", displayId: u.displayId || "", email: u.email || "",
        department: u.department || "", designation: u.designation || "",
        checkIn: a.checkIn || null, checkOut: a.checkOut || null, status: a.status || "absent",
      };
    });
    return NextResponse.json({ today: todayData });
  } catch { return NextResponse.json({ today: [] }); }
}
