import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const userId = body.userId;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  db.update(schema.notifications)
    .set({ read: true })
    .where(eq(schema.notifications.userId, userId))
    .run();
  return NextResponse.json({ success: true });
}
