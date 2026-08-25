import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 404 });
  const { id } = await params;
  try {
    const inv = (await db.collection(collections.invoices).findOne({ id, orgId })) as any;
    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json({ invoice: inv });
  } catch {
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  try {
    const now = new Date();
    const result = await db.collection(collections.invoices).updateOne(
      { id, orgId },
      {
        $set: {
          customerId: body.customerId || "",
          customerName: body.customerName || "",
          number: body.number || "",
          periodStart: body.periodStart || "",
          periodEnd: body.periodEnd || "",
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
          updatedAt: now,
        },
      },
    );
    if (result.matchedCount === 0)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: { id, customerId: body.customerId } });
  } catch (err) {
    console.error("[PUT /api/billing/invoices/:id]", err);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
  const { id } = await params;
  try {
    const result = await db.collection(collections.invoices).deleteOne({ id, orgId });
    if (result.deletedCount === 0)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
