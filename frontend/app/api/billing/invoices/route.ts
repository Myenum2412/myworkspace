import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  try {
    const invoices = await db
      .collection(collections.invoices)
      .find({ orgId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      data: {
        invoices: invoices.map((inv: any) => ({
          id: inv.id,
          number: inv.invoiceNumber,
          amountPaid: inv.total,
          currency: "INR",
          status: inv.status,
          pdfUrl: null,
          hostedUrl: null,
          createdAt: inv.createdAt,
          customerName: inv.customerName || inv.clientName || "—",
          services: inv.items?.map((i: any) => (i.details || i.description || "Service").split(" - ")[0]).join(", ") || "—",
        })),
      },
    });
  } catch (err) {
    console.error("[API /api/billing/invoices] GET error:", err);
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { orgId, clientId, customerName, invoiceNumber, invoiceDate, items, subTotal, discountPercent, discountAmount, tdsTcsType, tdsTcsRate, tdsTcsAmount, adjustmentValue, total, isSimplifiedView } = body;

  if (!orgId || !items?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const invoice = {
    id: uuid(),
    orgId,
    clientId: clientId || null,
    customerName: customerName || null,
    invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
    invoiceDate: invoiceDate || new Date().toISOString(),
    status: "open",
    items,
    subTotal: subTotal || 0,
    discountPercent: discountPercent || 0,
    discountAmount: discountAmount || 0,
    tdsTcsType: tdsTcsType || "none",
    tdsTcsRate: tdsTcsRate || 0,
    tdsTcsAmount: tdsTcsAmount || 0,
    adjustmentValue: adjustmentValue || 0,
    total: total || 0,
    isSimplifiedView: isSimplifiedView || false,
    createdBy: session.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.collection(collections.invoices).insertOne(invoice);
    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (err) {
    console.error("[API /api/billing/invoices] POST error:", err);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
