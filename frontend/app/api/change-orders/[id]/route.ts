import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id } = await params;
  try {
    const now = new Date();
    const update = {
      $set: {
        orderNo: body.orderNo || undefined,
        title: String(body.title || "").trim(),
        description: body.description || "",
        projectId: body.projectId || "",
        projectName: body.projectName || "",
        amount: Number(body.amount ?? 0),
        reason: body.reason || "",
        ...(body.status ? { status: body.status } : {}),
        updatedAt: now,
      },
    };
    const result = await db.collection(collections.changeOrders).updateOne({ id, orgId }, update);
    if (result.matchedCount === 0)
      return NextResponse.json({ error: "Change order not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/change-orders/:id]", err);
    return NextResponse.json({ error: "Failed to update change order" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });
  const { id } = await params;
  try {
    const result = await db.collection(collections.changeOrders).deleteOne({ id, orgId });
    if (result.deletedCount === 0)
      return NextResponse.json({ error: "Change order not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/change-orders/:id]", err);
    return NextResponse.json({ error: "Failed to delete change order" }, { status: 500 });
  }
}
