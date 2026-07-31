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
  if (!orgId) return NextResponse.json({ roles: [], members: [] });
  try {
    const [members, teams] = await Promise.all([
      db.collection(collections.orgMembers).find({ orgId }).toArray(),
      db.collection(collections.teams).find({ orgId }).toArray(),
    ]);
    const roles = [...new Set((members as any[]).map((m) => m.role).filter(Boolean))].map((role, i) => ({
      id: `role-${i}`, name: role as string, memberCount: (members as any[]).filter((m) => m.role === role).length,
    }));
    return NextResponse.json({ roles, members, teams });
  } catch { return NextResponse.json({ roles: [], members: [], teams: [] }); }
}