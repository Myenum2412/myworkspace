import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: fileId } = await params;
  const { sharedWithUserId } = await request.json();

  await db.collection(collections.fileShares).insertOne({
    id: uuid(),
    fileId,
    sharedByUserId: session.user.id,
    sharedWithUserId: sharedWithUserId || null,
    orgId: "demo-org-id",
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await db.collection(collections.fileShares).deleteOne({ id });

  return NextResponse.json({ success: true });
}
