import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  const logs = await db
    .collection(collections.activityLogs)
    .find({ orgId })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return NextResponse.json(logs);
}
