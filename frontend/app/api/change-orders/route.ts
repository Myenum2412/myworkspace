import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ items: [] });
  try {
    const raw = await db
      .collection(collections.changeOrders)
      .find({ orgId })
      .sort({ createdAt: -1 })
      .toArray();
    const items = raw.map((co) => ({
      id: co.id || co._id?.toString() || "",
      orderNo: co.orderNo || "",
      title: co.title || "",
      description: co.description || "",
      projectId: co.projectId || "",
      projectName: co.projectName || "",
      amount: Number(co.amount ?? 0),
      status: co.status || "Pending",
      requestedBy: co.requestedBy || "",
      requestedByName: co.requestedByName || "",
      reason: co.reason || "",
      coNumber: co.coNumber || co.orderNo || "",
      jobNumber: co.jobNumber || "",
      client: co.client || "",
      substructureRevised: co.substructureRevised || "",
      contractDrawingReference: co.contractDrawingReference || "",
      placingDrawingReference: co.placingDrawingReference || "",
      responsibleForRevision: co.responsibleForRevision || "",
      revisedFor: co.revisedFor || "",
      receivedDate: co.receivedDate || (co.createdAt ? new Date(co.createdAt).toISOString() : ""),
      drawingChanges: co.drawingChanges || [],
      weightDifferences: co.weightDifferences || [],
      createdAt: co.createdAt ? new Date(co.createdAt).toISOString() : "",
      updatedAt: co.updatedAt ? new Date(co.updatedAt).toISOString() : "",
    }));
    return NextResponse.json({ data: items });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

export async function POST(req: Request) {
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

  if (!String(body.title || "").trim())
    return NextResponse.json({ error: "Title is required" }, { status: 422 });
  if (!Number(body.amount ?? 0))
    return NextResponse.json({ error: "Amount is required" }, { status: 422 });

  try {
    const id = randomUUID();
    const now = new Date();
    const orderNo = String(
      body.orderNo ||
        `CO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.floor(1000 + Math.random() * 9000))}`,
    );
    const doc = {
      id,
      orgId,
      orderNo,
      title: String(body.title || "").trim(),
      description: body.description || "",
      projectId: body.projectId || "",
      projectName: body.projectName || "",
      amount: Number(body.amount ?? 0),
      status: body.status || "Pending",
      requestedBy: session.user.id,
      requestedByName: body.requestedByName || session.user.name || "",
      reason: body.reason || "",
      coNumber: body.coNumber || orderNo,
      jobNumber: body.jobNumber || "",
      client: body.client || "",
      substructureRevised: body.substructureRevised || "",
      contractDrawingReference: body.contractDrawingReference || "",
      placingDrawingReference: body.placingDrawingReference || "",
      responsibleForRevision: body.responsibleForRevision || "",
      revisedFor: body.revisedFor || "",
      receivedDate: body.receivedDate || now,
      drawingChanges: Array.isArray(body.drawingChanges) ? body.drawingChanges : [],
      weightDifferences: Array.isArray(body.weightDifferences) ? body.weightDifferences : [],
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(collections.changeOrders).insertOne(doc);
    return NextResponse.json(
      { success: true, data: { order: { id, orderNo, title: doc.title, status: doc.status } } },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/change-orders]", err);
    return NextResponse.json({ error: "Failed to create change order" }, { status: 500 });
  }
}
