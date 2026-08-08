import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ orgId: "", initialProjects: [], initialClientList: [] });
  try {
    const [projectDocs, clientDocs] = await Promise.all([
      db.collection(collections.projects).find({ orgId }).sort({ createdAt: -1 }).toArray(),
      db.collection(collections.clients).find({ orgId }).toArray(),
    ]);
    const initialProjects = (projectDocs as any[]).map((p) => ({
      id: p.id || p._id?.toString() || "",
      name: p.name || "",
      status: p.status || "Active",
      progress: Number(p.progress ?? 0),
      client: p.client || "",
      color: p.color || "#3b82f6",
      description: p.description || "",
      startDate: p.startDate || "",
      endDate: p.endDate || "",
      budget: Number(p.budget ?? 0),
      spent: Number(p.spent ?? 0),
      team: p.team || [],
      tasks: p.tasks || [],
      attachments: p.attachments || [],
    }));
    const initialClientList = (clientDocs as any[])
      .map((c) => c.name || c.companyName || "")
      .filter(Boolean);
    return NextResponse.json({ orgId, initialProjects, initialClientList });
  } catch {
    return NextResponse.json({ orgId, initialProjects: [], initialClientList: [] });
  }
}
