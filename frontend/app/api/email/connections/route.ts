import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docs = await db
    .collection(collections.emailConnections)
    .find({ userId: session.user.id })
    .project({ accessToken: 0, refreshToken: 0 })
    .toArray();

  return NextResponse.json({
    data: docs.map((doc) => ({
      id: doc.id || doc._id?.toString(),
      provider: doc.provider,
      email: doc.email,
      name: doc.name,
      syncEnabled: doc.syncEnabled,
      lastSyncAt: doc.lastSyncAt,
      createdAt: doc.createdAt,
    })),
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.collection(collections.emailConnections).deleteMany({
    userId: session.user.id,
    provider: "gmail",
  });

  return NextResponse.json({ success: true });
}
