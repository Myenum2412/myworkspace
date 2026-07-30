import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { getUserOrgId } from "@/lib/org";

const QUOTATIONS_COLLECTION = "quotations";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 404 });
  const { id } = await params;
  try {
    const q = await db.collection(QUOTATIONS_COLLECTION).findOne({ id, orgId }) as any;
    if (!q) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    return NextResponse.json({ quotation: q });
  } catch { return NextResponse.json({ error: "Failed to fetch quotation" }, { status: 500 }); }
}

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
    const result = await db.collection(QUOTATIONS_COLLECTION).updateOne(
      { id, orgId },
      {
        $set: {
          customerId: body.customerId || "",
          customerName: body.customerName || "",
          number: body.number || "",
          reference: body.reference || "",
          quotationDate: body.quotationDate || "",
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
          updatedAt: now,
        },
      }
    );
    if (result.matchedCount === 0) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: { id, customerId: body.customerId } });
  } catch (err) {
    console.error("[PUT /api/billing/quotations/:id]", err);
    return NextResponse.json({ error: "Failed to update quotation" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
  const { id } = await params;
  try {
    const result = await db.collection(QUOTATIONS_COLLECTION).deleteOne({ id, orgId });
    if (result.deletedCount === 0) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 }); }
}
