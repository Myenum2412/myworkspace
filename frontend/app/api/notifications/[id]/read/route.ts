import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.collection(collections.notifications).updateOne(
    { id },
    { $set: { read: true } }
  );
  return NextResponse.json({ success: true });
}
