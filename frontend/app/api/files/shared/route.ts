import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shares = db
    .select({
      id: schema.fileShares.id,
      fileId: schema.fileShares.fileId,
      sharedByUserId: schema.fileShares.sharedByUserId,
      createdAt: schema.fileShares.createdAt,
      originalName: schema.fileAttachments.originalName,
      mimeType: schema.fileAttachments.mimeType,
      size: schema.fileAttachments.size,
    })
    .from(schema.fileShares)
    .innerJoin(
      schema.fileAttachments,
      eq(schema.fileShares.fileId, schema.fileAttachments.id)
    )
    .where(eq(schema.fileShares.orgId, "demo-org-id"))
    .orderBy(desc(schema.fileShares.createdAt))
    .all();

  const userIds = [...new Set(shares.map((s) => s.sharedByUserId))];
  const users = userIds.length > 0
    ? db
        .select({ id: schema.users.id, name: schema.users.name })
        .from(schema.users)
        .all()
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const result = shares.map((s) => ({
    ...s,
    sharedByName: userMap[s.sharedByUserId] || "Unknown",
  }));

  return NextResponse.json(result);
}
