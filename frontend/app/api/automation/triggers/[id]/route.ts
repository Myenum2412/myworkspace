import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ensureUserOrg } from "@/lib/org";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);
  const { id } = await params;

  const trigger = await db.collection(collections.automationTriggers).findOne({ id, orgId });
  if (!trigger) return NextResponse.json({ error: "Trigger not found" }, { status: 404 });

  return NextResponse.json({ data: trigger });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);
  const { id } = await params;
  const body = await request.json();

  const existing = await db.collection(collections.automationTriggers).findOne({ id, orgId });
  if (!existing) return NextResponse.json({ error: "Trigger not found" }, { status: 404 });

  const update: Record<string, unknown> = { ...body, updatedBy: session.user.id, updatedAt: new Date() };
  delete update.id;
  delete update.orgId;
  delete update.createdAt;

  const result = await db.collection(collections.automationTriggers).findOneAndUpdate(
    { id, orgId },
    { $set: update },
    { returnDocument: "after" }
  );

  return NextResponse.json({ data: result });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);
  const { id } = await params;

  const existing = await db.collection(collections.automationTriggers).findOne({ id, orgId });
  if (!existing) return NextResponse.json({ error: "Trigger not found" }, { status: 404 });

  await db.collection(collections.automationTriggers).deleteOne({ id, orgId });

  return NextResponse.json({ success: true });
}
