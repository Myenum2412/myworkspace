import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.update(schema.notifications)
    .set({ read: true })
    .where(eq(schema.notifications.id, id))
    .run();
  return NextResponse.json({ success: true });
}
