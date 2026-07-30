import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { id } = await params;
  try {
    const now = new Date();
    const openingStock = Number(body.openingStock ?? 0);
    const stockIn = Number(body.stockIn ?? 0);
    const stockOut = Number(body.stockOut ?? 0);
    const update = {
      $set: {
        itemCode: body.itemCode || "",
        productName: String(body.productName || "").trim(),
        name: String(body.productName || "").trim(),
        category: body.category || "",
        brand: body.brand || "",
        unit: body.unit || "",
        openingStock, stockIn, stockOut,
        availableStock: openingStock + stockIn - stockOut,
        quantity: openingStock + stockIn - stockOut,
        reorderLevel: Number(body.reorderLevel ?? 0),
        purchasePrice: Number(body.purchasePrice ?? 0),
        sellingPrice: Number(body.sellingPrice ?? 0),
        price: Number(body.purchasePrice ?? 0),
        supplier: body.supplier || "",
        warehouse: body.warehouse || "",
        image: body.image || "",
        projectId: body.projectId || undefined,
        projectName: body.projectName || undefined,
        updatedAt: now,
        lastUpdated: now.toISOString(),
      },
    };
    const result = await db.collection(collections.stocks).updateOne({ id, orgId }, update);
    if (result.matchedCount === 0) return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/stocks/:id]", err);
    return NextResponse.json({ error: "Failed to update stock item" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });
  const { id } = await params;
  try {
    const result = await db.collection(collections.stocks).deleteOne({ id, orgId });
    if (result.deletedCount === 0) return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/stocks/:id]", err);
    return NextResponse.json({ error: "Failed to delete stock item" }, { status: 500 });
  }
}
