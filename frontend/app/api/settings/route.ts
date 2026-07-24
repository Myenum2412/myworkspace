import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  const user = {
    name: session.user.name || "User",
    email: session.user.email || "",
    avatar: session.user.image || "",
    role: session.user.role || "",
  };

  let initialSettings: Record<string, unknown> | null = null;
  if (orgId) {
    try {
      const settingsDoc = await db.collection("settings").findOne({ orgId }) as Record<string, unknown> | null;
      if (settingsDoc) {
        const { _id, ...rest } = settingsDoc;
        initialSettings = rest as Record<string, unknown>;
      }
    } catch {}
  }

  return NextResponse.json({ orgId: orgId || "", user, initialSettings });
}
