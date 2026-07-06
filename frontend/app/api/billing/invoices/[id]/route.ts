import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { collections } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });

  try {
    const invoice = await db.collection(collections.invoices).findOne({ id });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json({ data: invoice });
  } catch (err) {
    console.error("[API /api/billing/invoices/[id]] GET error:", err);
    return NextResponse.json({ error: "Failed to load invoice" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });

  try {
    const body = await req.json();
    const { orgId, clientId, customerName, invoiceNumber, invoiceDate, items, subTotal, discountPercent, discountAmount, tdsTcsType, tdsTcsRate, tdsTcsAmount, adjustmentValue, total, isSimplifiedView } = body;

    const updatedData = {
      ...(clientId && { clientId }),
      ...(customerName && { customerName }),
      ...(invoiceNumber && { invoiceNumber }),
      ...(invoiceDate && { invoiceDate }),
      ...(items && { items }),
      ...(subTotal !== undefined && { subTotal }),
      ...(discountPercent !== undefined && { discountPercent }),
      ...(discountAmount !== undefined && { discountAmount }),
      ...(tdsTcsType && { tdsTcsType }),
      ...(tdsTcsRate !== undefined && { tdsTcsRate }),
      ...(tdsTcsAmount !== undefined && { tdsTcsAmount }),
      ...(adjustmentValue !== undefined && { adjustmentValue }),
      ...(total !== undefined && { total }),
      ...(isSimplifiedView !== undefined && { isSimplifiedView }),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection(collections.invoices).updateOne(
      { id },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /api/billing/invoices/[id]] PUT error:", err);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });

  try {
    const result = await db.collection(collections.invoices).deleteOne({ id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /api/billing/invoices/[id]] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
