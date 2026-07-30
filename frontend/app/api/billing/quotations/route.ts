import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { randomUUID } from "crypto";

// Use a quotations collection name (add to schema if needed, reuse invoices collection with type)
const QUOTATIONS_COLLECTION = "quotations";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ quotations: [] });
  try {
    const raw = await db.collection(QUOTATIONS_COLLECTION).find({ orgId }).sort({ createdAt: -1 }).toArray();
    const quotations = (raw as any[]).map((q) => ({
      id: q.id || q._id?.toString() || "",
      orgId: q.orgId || "",
      customerId: q.customerId || "",
      customerName: q.customerName || "",
      number: q.number || "",
      reference: q.reference || "",
      quotationDate: q.quotationDate || "",
      expiryDate: q.expiryDate || "",
      items: q.items || [],
      subTotal: Number(q.subTotal ?? 0),
      discountPercent: Number(q.discountPercent ?? 0),
      discountAmount: Number(q.discountAmount ?? 0),
      taxRate: Number(q.taxRate ?? 0),
      taxAmount: Number(q.taxAmount ?? 0),
      total: Number(q.total ?? 0),
      notes: q.notes || "",
      termsAndConditions: q.termsAndConditions || "",
      status: q.status || "Draft",
      createdAt: q.createdAt || "",
    }));
    return NextResponse.json({ quotations });
  } catch { return NextResponse.json({ quotations: [] }); }
}

export async function POST(req: Request) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  try {
    const id = randomUUID();
    const now = new Date();
    const doc = {
      id,
      orgId: body.orgId || orgId,
      customerId: body.customerId || "",
      customerName: body.customerName || "",
      number: body.number || `QUO-${Date.now()}`,
      reference: body.reference || "",
      quotationDate: body.quotationDate || now.toISOString().slice(0, 10),
      expiryDate: body.expiryDate || "",
      items: Array.isArray(body.items) ? body.items : [],
      subTotal: Number(body.subTotal ?? 0),
      discountPercent: Number(body.discountPercent ?? 0),
      discountAmount: Number(body.discountAmount ?? 0),
      taxRate: Number(body.taxRate ?? 0),
      taxAmount: Number(body.taxAmount ?? 0),
      total: Number(body.total ?? 0),
      notes: body.notes || "",
      termsAndConditions: body.termsAndConditions || "",
      status: "Draft",
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(QUOTATIONS_COLLECTION).insertOne(doc);
    return NextResponse.json({ success: true, data: { id, customerId: doc.customerId, number: doc.number, total: doc.total, status: doc.status } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/billing/quotations]", err);
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 });
  }
}
