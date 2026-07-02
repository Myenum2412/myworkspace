import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db, collections } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try { session = await auth(); } catch { /* ignore */ }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "";
  if (role === "member" || role === "workspace" || role === "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const conversation = await db
    .collection(collections.aiConversations)
    .findOne({ id, userId: session.user.id });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const messages = await db
    .collection(collections.aiMessages)
    .find({ conversationId: id })
    .sort({ createdAt: 1 })
    .toArray();

  return NextResponse.json({ data: { ...conversation, messages } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try { session = await auth(); } catch { /* ignore */ }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "";
  if (role === "member" || role === "workspace" || role === "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title } = body;

  const result = await db
    .collection(collections.aiConversations)
    .updateOne(
      { id, userId: session.user.id },
      { $set: { title, updatedAt: new Date() } }
    );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try { session = await auth(); } catch { /* ignore */ }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "";
  if (role === "member" || role === "workspace" || role === "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const result = await db
    .collection(collections.aiConversations)
    .deleteOne({ id, userId: session.user.id });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  await db.collection(collections.aiMessages).deleteMany({ conversationId: id });

  return NextResponse.json({ success: true });
}
