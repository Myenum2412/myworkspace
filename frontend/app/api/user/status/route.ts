import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await db.collection(collections.users).findOne({ id: userId });
  if (!user) return NextResponse.json({ status: "offline" });
  return NextResponse.json({ status: user.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, status } = body;
  if (!userId || !status) return NextResponse.json({ error: "userId and status required" }, { status: 400 });

  await db.collection(collections.users).updateOne(
    { id: userId },
    { $set: { status, updatedAt: new Date() } }
  );

  return NextResponse.json({ success: true });
}
