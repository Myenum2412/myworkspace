import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { auth } from "@/lib/auth/config";
import { ensureUserOrg } from "@/lib/org";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);

    const stocks = await db
      .collection(collections.stocks)
      .find({ orgId }, { sort: { createdAt: -1 } })
      .toArray() as Record<string, unknown>[];

    return NextResponse.json({ success: true, data: stocks });
  } catch (err: any) {
    console.error("[API /api/stocks] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
    const body = await request.json();

    const stock = {
      id: uuid(),
      orgId,
      itemCode: body.itemCode || "",
      productName: body.productName || "",
      category: body.category || "",
      brand: body.brand || "",
      unit: body.unit || "",
      openingStock: Number(body.openingStock) || 0,
      stockIn: Number(body.stockIn) || 0,
      stockOut: Number(body.stockOut) || 0,
      availableStock: Number(body.availableStock) || 0,
      reorderLevel: Number(body.reorderLevel) || 0,
      purchasePrice: Number(body.purchasePrice) || 0,
      sellingPrice: Number(body.sellingPrice) || 0,
      supplier: body.supplier || "",
      warehouse: body.warehouse || "",
      status: body.status || "Active",
      image: body.image || "",
      projectId: body.projectId || "",
      projectName: body.projectName || "",
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(collections.stocks).insertOne(stock);

    return NextResponse.json({ success: true, data: stock }, { status: 201 });
  } catch (err: any) {
    console.error("[API /api/stocks] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Stock ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const result = await db.collection(collections.stocks).findOneAndUpdate(
      { id, orgId },
      { $set: { ...body, updatedBy: session.user.id, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("[API /api/stocks] PUT error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Stock ID is required" }, { status: 400 });
    }

    await db.collection(collections.stocks).deleteOne({ id, orgId });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API /api/stocks] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
