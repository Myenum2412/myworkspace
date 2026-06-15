import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  const logs = db
    .select()
    .from(schema.activityLogs)
    .where(eq(schema.activityLogs.orgId, orgId))
    .orderBy(desc(schema.activityLogs.createdAt))
    .limit(50)
    .all();

  return NextResponse.json(logs);
}
