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

    const engagements = await db
      .collection(collections.engagements)
      .find({ orgId }, { sort: { createdAt: -1 } })
      .toArray() as Record<string, unknown>[];

    return NextResponse.json({ success: true, data: engagements });
  } catch (err: any) {
    console.error("[API /api/engagements] GET error:", err);
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

    const engagement = {
      id: uuid(),
      orgId,
      date: body.date || new Date().toISOString().split("T")[0],
      customerName: body.customerName || "",
      contact: body.contact || "",
      source: body.source || "",
      status: body.status || "",
      assignedTo: body.assignedTo || "",
      followUpDate: body.followUpDate || "",
      remarks: body.remarks || "",
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(collections.engagements).insertOne(engagement);

    return NextResponse.json({ success: true, data: engagement }, { status: 201 });
  } catch (err: any) {
    console.error("[API /api/engagements] POST error:", err);
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
      return NextResponse.json({ error: "Engagement ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const result = await db.collection(collections.engagements).findOneAndUpdate(
      { id, orgId },
      { $set: { ...body, updatedBy: session.user.id, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("[API /api/engagements] PUT error:", err);
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
      return NextResponse.json({ error: "Engagement ID is required" }, { status: 400 });
    }

    await db.collection(collections.engagements).deleteOne({ id, orgId });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API /api/engagements] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
