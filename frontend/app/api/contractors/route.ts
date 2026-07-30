import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { randomUUID } from "crypto";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ contractors: [] });
  try {
    const raw = await db.collection(collections.contractors).find({ orgId }).sort({ createdAt: -1 }).toArray();
    const contractors = (raw as any[]).map((c) => ({
      id: c.id || c._id?.toString() || "",
      fullName: c.fullName || "",
      companyName: c.companyName || "",
      emailAddress: c.emailAddress || "",
      mobileNumber: c.mobileNumber || "",
      contractorType: c.contractorType || "",
      mainTrade: c.mainTrade || "",
      country: c.country || "",
      city: c.city || "",
      status: c.status || "Active",
    }));
    return NextResponse.json({ contractors });
  } catch { return NextResponse.json({ contractors: [] }); }
}

export async function POST(req: Request) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  // Validate required fields
  const fields: Record<string, string> = {};
  if (!String(body.fullName || "").trim()) fields.fullName = "Full name is required";
  if (!String(body.mobileNumber || "").trim()) fields.mobileNumber = "Mobile number is required";
  if (!String(body.emailAddress || "").trim()) fields.emailAddress = "Email address is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.emailAddress))) fields.emailAddress = "Invalid email format";
  if (!String(body.mainTrade || "").trim()) fields.mainTrade = "Main trade is required";
  if (!String(body.accountHolderName || "").trim()) fields.accountHolderName = "Account holder name is required";
  if (!String(body.bankName || "").trim()) fields.bankName = "Bank name is required";
  const emergencyContacts = Array.isArray(body.emergencyContacts) ? body.emergencyContacts : [];
  const validContacts = emergencyContacts.filter((c: any) => c?.name?.trim() && c?.phoneNumber?.trim());
  if (validContacts.length === 0) fields.emergencyContacts = "At least one emergency contact with name and phone is required";
  if (Object.keys(fields).length > 0) return NextResponse.json({ error: "Validation failed", fields }, { status: 422 });

  try {
    const existing = await db.collection(collections.contractors).findOne({ orgId, emailAddress: String(body.emailAddress).toLowerCase().trim() });
    if (existing) return NextResponse.json({ error: "A contractor with this email already exists", fields: { emailAddress: "Email already in use" } }, { status: 409 });

    const id = randomUUID();
    const now = new Date();
    const doc = {
      id,
      orgId,
      fullName: String(body.fullName || "").trim(),
      companyName: body.companyName ? String(body.companyName).trim() : undefined,
      mobileNumber: String(body.mobileNumber || "").trim(),
      emailAddress: String(body.emailAddress || "").toLowerCase().trim(),
      country: body.country || "",
      city: body.city || "",
      address: body.address || undefined,
      contractorType: body.contractorType || "",
      mainTrade: body.mainTrade || "",
      otherTrade: body.otherTrade || undefined,
      yearsOfExperience: body.yearsOfExperience || "",
      numberOfWorkers: body.numberOfWorkers || "",
      licenseNumber: body.licenseNumber || undefined,
      licenseExpiry: body.licenseExpiry || undefined,
      insuranceAvailable: Boolean(body.insuranceAvailable),
      availableFrom: body.availableFrom || "",
      preferredWorkArea: body.preferredWorkArea || "",
      willingToTravel: Boolean(body.willingToTravel),
      accountHolderName: String(body.accountHolderName || "").trim(),
      bankName: String(body.bankName || "").trim(),
      accountNumber: body.accountNumber || "",
      swiftBic: body.swiftBic || undefined,
      currency: body.currency || "USD",
      emergencyContacts: validContacts,
      status: "Active",
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(collections.contractors).insertOne(doc);
    return NextResponse.json({ success: true, data: { contractor: { id, fullName: doc.fullName, emailAddress: doc.emailAddress, status: doc.status } } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/contractors]", err);
    return NextResponse.json({ error: "Failed to create contractor" }, { status: 500 });
  }
}
