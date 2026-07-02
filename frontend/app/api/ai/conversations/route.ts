import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db, collections } from "@/lib/db";

export async function GET() {
  let session;
  try { session = await auth(); } catch { /* ignore */ }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "";
  if (role === "member" || role === "workspace" || role === "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const conversations = await db
    .collection(collections.aiConversations)
    .find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ data: conversations });
}

export async function POST(req: NextRequest) {
  let session;
  try { session = await auth(); } catch { /* ignore */ }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "";
  if (role === "member" || role === "workspace" || role === "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title } = body;

  const { v4: uuid } = await import("uuid");
  const now = new Date();

  const conversation = {
    id: uuid(),
    userId: session.user.id,
    orgId: session.user.orgId || "",
    title: title || "New Chat",
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(collections.aiConversations).insertOne(conversation);

  return NextResponse.json({ data: conversation }, { status: 201 });
}
