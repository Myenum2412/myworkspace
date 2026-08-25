import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ items: [] });
  try {
    const raw = await db
      .collection(collections.stocks)
      .find({ orgId })
      .sort({ createdAt: -1 })
      .toArray();
    const items = (raw as any[]).map((s) => ({
      id: s.id || s._id?.toString() || "",
      itemCode: s.itemCode || "",
      productName: s.productName || s.name || "",
      category: s.category || "",
      brand: s.brand || "",
      unit: s.unit || "",
      openingStock: Number(s.openingStock ?? 0),
      stockIn: Number(s.stockIn ?? 0),
      stockOut: Number(s.stockOut ?? 0),
      availableStock: Number(s.availableStock ?? s.quantity ?? 0),
      reorderLevel: Number(s.reorderLevel ?? 0),
      purchasePrice: Number(s.purchasePrice ?? s.price ?? 0),
      sellingPrice: Number(s.sellingPrice ?? 0),
      supplier: s.supplier || "",
      warehouse: s.warehouse || "",
      status: s.status || "Active",
      lastUpdated: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString(),
      image: s.image || "",
      projectId: s.projectId || "",
      projectName: s.projectName || "",
    }));
    return NextResponse.json({ data: items });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

export async function POST(req: Request) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!String(body.productName || "").trim())
    return NextResponse.json({ error: "Product name is required" }, { status: 422 });

  try {
    const id = randomUUID();
    const now = new Date();
    const openingStock = Number(body.openingStock ?? 0);
    const stockIn = Number(body.stockIn ?? 0);
    const stockOut = Number(body.stockOut ?? 0);
    const doc = {
      id,
      orgId,
      itemCode: body.itemCode || `ITM-${Date.now()}`,
      productName: String(body.productName || "").trim(),
      name: String(body.productName || "").trim(),
      category: body.category || "",
      brand: body.brand || "",
      unit: body.unit || "",
      openingStock,
      stockIn,
      stockOut,
      availableStock: openingStock + stockIn - stockOut,
      reorderLevel: Number(body.reorderLevel ?? 0),
      purchasePrice: Number(body.purchasePrice ?? 0),
      sellingPrice: Number(body.sellingPrice ?? 0),
      price: Number(body.purchasePrice ?? 0),
      quantity: openingStock + stockIn - stockOut,
      supplier: body.supplier || "",
      warehouse: body.warehouse || "",
      image: body.image || "",
      projectId: body.projectId || undefined,
      projectName: body.projectName || undefined,
      status: "Active",
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
      lastUpdated: now.toISOString(),
    };
    await db.collection(collections.stocks).insertOne(doc);
    return NextResponse.json(
      { success: true, data: { stock: { id, productName: doc.productName, status: doc.status } } },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/stocks]", err);
    return NextResponse.json({ error: "Failed to create stock item" }, { status: 500 });
  }
}
