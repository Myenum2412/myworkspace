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
  if (!orgId) return NextResponse.json({ projects: [], clients: [], clientList: [] });

  try {
    const [projectsRaw, clientsRaw, clientUsers] = await Promise.all([
      db.collection(collections.projects).find({ orgId }).sort({ createdAt: -1 }).toArray(),
      db.collection(collections.clients).find({ orgId }).sort({ createdAt: -1 }).limit(100).toArray(),
      db.collection(collections.clientUsers).find({ orgId }).toArray(),
    ]);

    const userMap = new Map<string, string>();
    for (const u of clientUsers as any[]) { if (u.clientId && u.username) userMap.set(u.clientId, u.username); }

    const projects = (projectsRaw as any[]).map((p) => ({
      id: p.id || String(p._id || ""), name: p.name || "", client: p.client || "", color: p.color || "#93c5fd",
      description: p.description || "", deadline: p.dueDate || p.deadline || null, tracked: Number(p.tracked ?? 0),
      progress: Number(p.progress ?? 0), access: p.access || "Public", status: p.status || "Active",
      members: Array.isArray(p.members) ? p.members : undefined, headId: p.headId || undefined,
      headName: p.headName || undefined, headAvatar: p.headAvatar || undefined, priority: p.priority || "medium",
      category: p.category || "", budget: Number(p.budget ?? 0), spent: Number(p.spent ?? 0), startDate: p.startDate || null,
    }));

    const clientList = (clientsRaw as any[]).map((c) => c.name as string).filter(Boolean);
    const clients = (clientsRaw as any[]).map((c) => ({
      id: (c.id ?? (c._id instanceof ObjectId ? c._id.toString() : String(c._id ?? ""))) as string,
      name: c.name || "", email: c.email || "", username: userMap.get((c.id ?? String(c._id)) as string) || c.username || "",
      company: c.company || "", projects: Number(c.projects ?? 0), status: c.status || "",
    }));

    return NextResponse.json({ projects, clients, clientList });
  } catch { return NextResponse.json({ projects: [], clients: [], clientList: [] }); }
}
