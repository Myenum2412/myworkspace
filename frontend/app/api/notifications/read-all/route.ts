import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const userId = body.userId;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  await db.collection(collections.notifications).updateMany(
    { userId },
    { $set: { read: true } }
  );
  return NextResponse.json({ success: true });
}
