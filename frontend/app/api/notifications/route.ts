import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const notifications = await db
    .collection(collections.notifications)
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return NextResponse.json(notifications);
}
