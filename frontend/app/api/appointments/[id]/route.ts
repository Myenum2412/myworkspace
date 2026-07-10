import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { ensureUserOrg } from "@/lib/org";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
    const { id } = await params;

    const appointment = await db.collection(collections.appointments).findOne({ id, orgId });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: appointment });
  } catch (err: any) {
    console.error("[API /api/appointments/:id] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
    const { id } = await params;
    const body = await request.json();

    const result = await db.collection(collections.appointments).findOneAndUpdate(
      { id, orgId },
      { $set: { ...body, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("[API /api/appointments/:id] PUT error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
    const { id } = await params;

    const result = await db.collection(collections.appointments).deleteOne({ id, orgId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API /api/appointments/:id] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
