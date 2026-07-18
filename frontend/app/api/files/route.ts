import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";

export async function GET(request: Request) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  const projectId = searchParams.get("projectId");
  const category = searchParams.get("category");
  const clientId = searchParams.get("clientId");
  const folderId = searchParams.get("folderId");

  try {
    const filter: Record<string, unknown> = { orgId, deletedAt: null };
    if (projectId) {
      filter.projectId = projectId;
    }
    if (category && ["profile", "report", "general"].includes(category)) {
      filter.category = category;
    }
    if (clientId) {
      filter.clientId = clientId;
    }
    if (folderId) {
      filter.folderId = folderId;
    } else if (folderId === "") {
      filter.folderId = null;
    }

    const files = await db.collection(collections.fileAttachments)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const userIds = [...new Set(files.map((f: Record<string, unknown>) => f.uploaderId as string))];
    const users = await db.collection(collections.users)
      .find({ id: { $in: userIds } })
      .project({ id: 1, name: 1, image: 1 })
      .toArray();
    const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));

    const projectIds = [...new Set(files.map((f: Record<string, unknown>) => (f.projectId || "") as string).filter(Boolean))];
    const projects = projectIds.length > 0
      ? await db.collection(collections.projects)
          .find({ id: { $in: projectIds } })
          .project({ id: 1, name: 1 })
          .toArray()
      : [];
    const projectMap = new Map(projects.map((p: Record<string, unknown>) => [p.id, p]));

    const result = files.map((f: Record<string, unknown>) => {
      const u = userMap.get(f.uploaderId as string) as Record<string, unknown> | undefined;
      const p = f.projectId ? projectMap.get(f.projectId as string) as Record<string, unknown> | undefined : undefined;
      return {
        id: f.id,
        originalName: f.originalName || f.name,
        mimeType: f.mimeType,
        size: f.size,
        createdAt: f.createdAt,
        uploaderName: u?.name || "Unknown",
        uploaderAvatar: u?.image || "",
        projectId: f.projectId || null,
        projectName: p?.name || null,
        description: f.description || "",
        storagePath: f.storagePath,
      };
    });

    return NextResponse.json({ data: result });
  } catch (e) {
    console.error("Failed to fetch files:", e);
    return NextResponse.json({ error: "Could not load files" }, { status: 500 });
  }
}
