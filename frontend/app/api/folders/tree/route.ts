import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ensureUserOrg } from "@/lib/org";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let orgId = req.nextUrl.searchParams.get("orgId");
    if (!orgId) {
      try {
        orgId = await ensureUserOrg(session.user.id, session.user.email);
      } catch {
        return NextResponse.json({ error: "No organization found" }, { status: 400 });
      }
    }

    const folders = await db
      .collection("folders")
      .find({ orgId, deletedAt: null })
      .sort({ path: 1 })
      .toArray();

    const tree = buildTree(folders, null);

    return NextResponse.json({ data: tree });
  } catch (err) {
    console.error("[api/folders/tree] error:", err);
    return NextResponse.json({ success: false, error: "Could not load folder tree" }, { status: 500 });
  }
}

function buildTree(folders: any[], parentId: string | null): any[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .map((f) => ({ ...f, children: buildTree(folders, f.id) }));
}
