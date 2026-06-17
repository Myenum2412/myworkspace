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

  const tasks = await db
    .collection(collections.tasks)
    .find({ orgId })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json(tasks);
}
