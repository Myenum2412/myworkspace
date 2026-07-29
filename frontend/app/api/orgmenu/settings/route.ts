import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ settings: null });
  try {
    const settings = await db.collection("settings").findOne({ orgId }) as any;
    return NextResponse.json({ settings: settings ? (() => { const { _id, ...rest } = settings; return rest; })() : null });
  } catch { return NextResponse.json({ settings: null }); }
}

export async function PUT(req: Request) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  try {
    const body = await req.json();
    const update: Record<string, unknown> = { ...body, orgId };
    const result = await db.collection("settings").findOneAndUpdate(
      { orgId },
      { $set: update },
      { upsert: true, returnDocument: "after" }
    );
    const settings = result as any;
    return NextResponse.json({ settings: settings ? (() => { const { _id, ...rest } = settings; return rest; })() : null });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
