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
  if (!orgId) return NextResponse.json({ files: [] });
  try {
    const raw = await db.collection(collections.fileAttachments).find({ orgId }).sort({ createdAt: -1 }).toArray();
    const files = (raw as any[]).map((f) => ({
      id: f.id || f._id?.toString() || "", originalName: f.originalName || "", mimeType: f.mimeType || "",
      size: f.size || 0, category: f.category || "general", uploadedBy: f.uploadedBy || "",
      createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : "",
    }));
    return NextResponse.json({ files });
  } catch { return NextResponse.json({ files: [] }); }
}
