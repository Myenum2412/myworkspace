import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ObjectId } from "mongodb";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ clients: [], user: { name: "", email: "", avatar: "" } });
  try {
    const raw = await db.collection(collections.clients).find({ orgId }).sort({ createdAt: -1 }).toArray();
    const clients = (raw as any[]).map((c) => ({
      id: c.id ?? (c._id instanceof ObjectId ? c._id.toString() : String(c._id ?? "")),
      name: c.name || "", email: c.email || "", company: c.company || "",
      projects: Number(c.projects ?? 0), status: c.status || "",
    }));
    return NextResponse.json({ initialClients: clients, user: { name: session.user.name, email: session.user.email, avatar: session.user.image } });
  } catch { return NextResponse.json({ clients: [], user: { name: "", email: "", avatar: "" } }); }
}
