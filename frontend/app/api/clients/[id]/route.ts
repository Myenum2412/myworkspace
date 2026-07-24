import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ObjectId } from "mongodb";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 404 });
  try {
    const { id } = await params;
    const client = await db.collection(collections.clients).findOne({ id, orgId }) as any;
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ client: { id: client.id || client._id?.toString() || "", name: client.name || "", email: client.email || "", company: client.company || "", status: client.status || "" } });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
