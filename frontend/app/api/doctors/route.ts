import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { ensureUserOrg } from "@/lib/org";
import { v4 as uuid } from "uuid";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);

    const doctors = await db
      .collection(collections.doctors)
      .find({ orgId })
      .sort({ doctorName: 1 })
      .toArray();

    return NextResponse.json({ success: true, data: doctors });
  } catch (err: any) {
    console.error("[API /api/doctors] GET error:", err);
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

    if (!body.doctorName || !body.specialization) {
      return NextResponse.json({ error: "Doctor name and specialization are required" }, { status: 400 });
    }

    const doctor = {
      id: uuid(),
      orgId,
      doctorName: body.doctorName,
      specialization: body.specialization,
      department: body.department || "",
      consultationFee: Number(body.consultationFee) || 0,
      phone: body.phone || "",
      email: body.email || "",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection(collections.doctors).insertOne(doctor);
    return NextResponse.json({ success: true, data: doctor }, { status: 201 });
  } catch (err: any) {
    console.error("[API /api/doctors] POST error:", err);
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
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const result = await db.collection(collections.doctors).findOneAndUpdate(
      { id, orgId },
      { $set: { ...body, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("[API /api/doctors] PUT error:", err);
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
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 });
    }

    const result = await db.collection(collections.doctors).deleteOne({ id, orgId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API /api/doctors] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
