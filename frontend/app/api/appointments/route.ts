import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { ensureUserOrg } from "@/lib/org";
import { v4 as uuid } from "uuid";

function generateAppointmentId(): string {
  const prefix = "APT";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
    const { searchParams } = new URL(request.url);

    const filter: Record<string, unknown> = { orgId };

    const status = searchParams.get("status");
    if (status) filter.status = status;

    const doctorId = searchParams.get("doctorId");
    if (doctorId) filter.doctorId = doctorId;

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      filter.appointmentDate = {};
      if (dateFrom) (filter.appointmentDate as Record<string, string>).$gte = dateFrom;
      if (dateTo) (filter.appointmentDate as Record<string, string>).$lte = dateTo;
    }

    const search = searchParams.get("search");
    if (search) {
      filter.$or = [
        { patientName: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
        { appointmentId: { $regex: search, $options: "i" } },
      ];
    }

    const sortField = searchParams.get("sort") || "createdAt";
    const sortOrder = searchParams.get("order") === "asc" ? 1 : -1;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      db
        .collection(collections.appointments)
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(collections.appointments).countDocuments(filter),
    ]);

    const doctorIds = [...new Set(appointments.map((a: Record<string, unknown>) => a.doctorId as string))];
    const doctors = doctorIds.length > 0
      ? await db.collection(collections.doctors).find({ id: { $in: doctorIds } }).toArray()
      : [];
    const doctorMap = new Map(doctors.map((d: Record<string, unknown>) => [d.id, d.doctorName as string]));

    const enriched = appointments.map((a: Record<string, unknown>) => ({
      ...a,
      doctorName: doctorMap.get(a.doctorId as string) || "Unknown",
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("[API /api/appointments] GET error:", err);
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

    if (!body.patientName) {
      return NextResponse.json({ error: "Patient name is required" }, { status: 400 });
    }
    if (!body.mobileNumber) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }
    if (!body.doctorId) {
      return NextResponse.json({ error: "Doctor selection is required" }, { status: 400 });
    }
    if (!body.appointmentDate) {
      return NextResponse.json({ error: "Appointment date is required" }, { status: 400 });
    }
    if (body.appointmentDate < new Date().toISOString().split("T")[0]) {
      return NextResponse.json({ error: "Appointment date cannot be in the past" }, { status: 400 });
    }
    if (!body.preferredTime) {
      return NextResponse.json({ error: "Preferred time is required" }, { status: 400 });
    }
    if (!body.reasonForVisit) {
      return NextResponse.json({ error: "Reason for visit is required" }, { status: 400 });
    }

    const duplicate = await db.collection(collections.appointments).findOne({
      orgId,
      doctorId: body.doctorId,
      appointmentDate: body.appointmentDate,
      preferredTime: body.preferredTime,
      status: { $ne: "Cancelled" },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "This time slot is already booked for this doctor" },
        { status: 409 }
      );
    }

    const doctor = await db.collection(collections.doctors).findOne({ id: body.doctorId, orgId });

    const appointment = {
      id: uuid(),
      orgId,
      appointmentId: generateAppointmentId(),
      patientName: body.patientName,
      mobileNumber: body.mobileNumber,
      email: body.email || "",
      doctorId: body.doctorId,
      doctorName: doctor?.doctorName || "Unknown",
      appointmentDate: body.appointmentDate,
      preferredTime: body.preferredTime,
      reasonForVisit: body.reasonForVisit,
      notes: body.notes || "",
      status: "Pending",
      bookingDatetime: new Date().toISOString(),
      createdBy: session.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection(collections.appointments).insertOne(appointment);
    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
  } catch (err: any) {
    console.error("[API /api/appointments] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
