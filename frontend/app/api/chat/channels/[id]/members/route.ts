import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const incoming = Array.isArray(body.members) ? (body.members as string[]) : [];
  const userIds = [...new Set(incoming)].filter(Boolean);
  if (userIds.length === 0)
    return NextResponse.json({ error: "No members provided" }, { status: 422 });

  try {
    const channel = await db
      .collection(collections.chatChannels)
      .findOne({ id, orgId, members: session.user.id });
    if (!channel)
      return NextResponse.json({ error: "Channel not found or no access" }, { status: 404 });

    const current = [...new Set([session.user.id, ...((channel as any).members || [])])];
    const merged = [...new Set([...current, ...userIds])];
    const now = new Date();
    await db
      .collection(collections.chatChannels)
      .updateOne({ id, orgId }, { $set: { members: merged, updatedAt: now } });
    return NextResponse.json({ success: true, data: { members: merged } });
  } catch {
    return NextResponse.json({ error: "Failed to add members" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });

  const { id } = await params;
  const url = new URL(req.url);
  const target = url.searchParams.get("userId");
  if (!target) return NextResponse.json({ error: "userId is required" }, { status: 422 });

  try {
    const channel = await db
      .collection(collections.chatChannels)
      .findOne({ id, orgId, members: session.user.id });
    if (!channel)
      return NextResponse.json({ error: "Channel not found or no access" }, { status: 404 });
    if ((channel as any).createdBy === target)
      return NextResponse.json({ error: "Cannot remove the creator" }, { status: 422 });

    const remaining = ((channel as any).members || []).filter((m: string) => m !== target);
    const now = new Date();
    await db
      .collection(collections.chatChannels)
      .updateOne({ id, orgId }, { $set: { members: remaining, updatedAt: now } });
    return NextResponse.json({ success: true, data: { members: remaining } });
  } catch {
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
