import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { randomUUID } from "crypto";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ invoices: [] });
  try {
    const raw = await db.collection(collections.invoices).find({ orgId }).sort({ createdAt: -1 }).toArray();
    const invoices = (raw as any[]).map((inv) => ({
      id: inv.id || inv._id?.toString() || "",
      orgId: inv.orgId || "",
      customerId: inv.customerId || "",
      customerName: inv.customerName || "",
      number: inv.number || "",
      periodStart: inv.periodStart || "",
      periodEnd: inv.periodEnd || "",
      items: inv.items || [],
      subTotal: Number(inv.subTotal ?? 0),
      discountPercent: Number(inv.discountPercent ?? 0),
      discountAmount: Number(inv.discountAmount ?? 0),
      tdsTcsType: inv.tdsTcsType || "",
      tdsTcsRate: inv.tdsTcsRate || "",
      tdsTcsAmount: Number(inv.tdsTcsAmount ?? 0),
      adjustmentValue: Number(inv.adjustmentValue ?? 0),
      total: Number(inv.total ?? 0),
      status: inv.status || "Draft",
      isSimplifiedView: Boolean(inv.isSimplifiedView),
      createdAt: inv.createdAt || "",
    }));
    return NextResponse.json({ invoices });
  } catch { return NextResponse.json({ invoices: [] }); }
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
      number: body.number || `INV-${Date.now()}`,
      periodStart: body.periodStart || now.toISOString().slice(0, 10),
      periodEnd: body.periodEnd || now.toISOString().slice(0, 10),
      items: Array.isArray(body.items) ? body.items : [],
      subTotal: Number(body.subTotal ?? 0),
      discountPercent: Number(body.discountPercent ?? 0),
      discountAmount: Number(body.discountAmount ?? 0),
      tdsTcsType: body.tdsTcsType || "",
      tdsTcsRate: body.tdsTcsRate || "",
      tdsTcsAmount: Number(body.tdsTcsAmount ?? 0),
      adjustmentValue: Number(body.adjustmentValue ?? 0),
      total: Number(body.total ?? 0),
      isSimplifiedView: Boolean(body.isSimplifiedView),
      status: "Draft",
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(collections.invoices).insertOne(doc);
    return NextResponse.json({ success: true, data: { id, customerId: doc.customerId, number: doc.number, total: doc.total, status: doc.status } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/billing/invoices]", err);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
