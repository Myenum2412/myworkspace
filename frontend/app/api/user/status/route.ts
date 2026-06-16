import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const users = db.select().from(schema.users).where(eq(schema.users.id, userId)).all();
  if (users.length === 0) return NextResponse.json({ status: "offline" });
  return NextResponse.json({ status: users[0].status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, status } = body;
  if (!userId || !status) return NextResponse.json({ error: "userId and status required" }, { status: 400 });

  db.update(schema.users)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.users.id, userId))
    .run();

  return NextResponse.json({ success: true });
}
