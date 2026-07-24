import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ensureUserOrg } from "@/lib/org";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ employees: [] });
  try {
    const [members, attendanceDocs] = await Promise.all([
      db.collection(collections.orgMembers).find({ orgId }).toArray(),
      db.collection("orgmembers").find({ orgId }).toArray(),
    ]);
    const memberUserIds = (members as any[]).map((m) => m.userId).filter(Boolean);
    const users = memberUserIds.length > 0 ? await db.collection(collections.users).find({ id: { $in: memberUserIds } }).toArray() : [];
    const userMap = new Map((users as any[]).map((u) => [u.id, u]));
    const attendanceByUser = new Map<string, any[]>();
    for (const a of attendanceDocs as any[]) {
      const uid = a.userId || a.employeeId;
      if (!attendanceByUser.has(uid)) attendanceByUser.set(uid, []);
      attendanceByUser.get(uid)!.push(a);
    }
    const employees = (members as any[]).map((m) => {
      const u = userMap.get(m.userId) || {} as any;
      const records = attendanceByUser.get(m.userId) || [];
      return { userId: m.userId, name: u.name || "Unknown", email: u.email || "", department: u.department || "", records };
    });
    return NextResponse.json({ employees });
  } catch { return NextResponse.json({ employees: [] }); }
}
