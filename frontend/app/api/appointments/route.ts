import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ensureUserOrg } from "@/lib/org";
import { randomUUID } from "crypto";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ doctors: [] });
  try {
    const raw = await db.collection(collections.doctors).find({ orgId }).sort({ doctorName: 1 }).toArray();
    const doctors = (raw as any[]).map((d) => ({
      id: d.id || "", orgId: d.orgId || "", doctorName: d.doctorName || "",
      specialization: d.specialization || "", department: d.department || "",
      consultationFee: d.consultationFee || 0, phone: d.phone || "", email: d.email || "",
      status: d.status || "active", createdAt: d.createdAt || "", updatedAt: d.updatedAt || "",
    }));
    return NextResponse.json({ doctors });
  } catch { return NextResponse.json({ doctors: [] }); }
}

export async function POST(req: Request) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  if (!String(body.patientName || "").trim()) return NextResponse.json({ error: "Patient name is required", success: false }, { status: 422 });
  if (!String(body.doctorId || "").trim()) return NextResponse.json({ error: "Doctor is required", success: false }, { status: 422 });
  if (!String(body.appointmentDate || "").trim()) return NextResponse.json({ error: "Appointment date is required", success: false }, { status: 422 });

  try {
    const id = randomUUID();
    const now = new Date();
    // Generate sequential appointment ID
    const counter = await db.collection(collections.counters).findOneAndUpdate(
      { _id: `appointment_${orgId}` as any },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    const seq = (counter as any)?.seq ?? 1;
    const appointmentId = `APT-${String(seq).padStart(4, "0")}`;

    // Lookup doctor name
    let doctorName = String(body.doctorName || "");
    if (!doctorName && body.doctorId) {
      const doctor = await db.collection(collections.doctors).findOne({ id: String(body.doctorId), orgId }) as any;
      if (doctor) doctorName = doctor.doctorName || "";
    }

    const doc = {
      id, orgId, appointmentId,
      patientName: String(body.patientName || "").trim(),
      mobileNumber: String(body.mobileNumber || "").trim(),
      email: String(body.email || "").trim(),
      doctorId: String(body.doctorId || ""),
      doctorName,
      appointmentDate: String(body.appointmentDate || ""),
      preferredTime: String(body.preferredTime || ""),
      reasonForVisit: String(body.reasonForVisit || ""),
      notes: String(body.notes || ""),
      status: "Pending",
      source: body.source || "web",
      bookingDatetime: now.toISOString(),
      createdBy: session.user.id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await db.collection(collections.appointments).insertOne(doc);
    return NextResponse.json({ success: true, appointment: doc }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/appointments]", err);
    return NextResponse.json({ success: false, error: "Failed to book appointment" }, { status: 500 });
  }
}
