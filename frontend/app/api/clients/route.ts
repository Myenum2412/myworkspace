import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";
import { v4 as uuid } from "uuid";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ clients: [], user: { name: "", email: "", avatar: "" } });
  try {
    const raw = await db.collection(collections.clients).find({ orgId }).sort({ createdAt: -1 }).toArray();
    const clients = (raw as any[]).map((c) => ({
      id: c.id ?? (c._id instanceof ObjectId ? c._id.toString() : String(c._id ?? "")),
      name: c.name || "", email: c.email || "", company: c.company || "",
      projects: Number(c.projects ?? 0), status: c.status || "",
    }));
    return NextResponse.json({ initialClients: clients, user: { name: session.user.name, email: session.user.email, avatar: session.user.image } });
  } catch { return NextResponse.json({ clients: [], user: { name: "", email: "", avatar: "" } }); }
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
  if (!String(body.company || "").trim()) fields.companyName = "Company name is required";
  if (!String(body.displayName || "").trim()) fields.displayName = "Display name is required";
  if (!String(body.email || "").trim()) fields.email = "Email address is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) fields.email = "Invalid email format";
  if (!String(body.gstTreatment || "").trim()) fields.gstTreatment = "GST Treatment is required";
  if (body.portalAccess && !String(body.password || "").trim()) fields.clientPassword = "Password is required when portal access is enabled";
  if (Object.keys(fields).length > 0) return NextResponse.json({ error: "Validation failed", fields }, { status: 422 });

  try {
    // Check for duplicate email within the same org
    const existing = await db.collection(collections.clients).findOne({ orgId, email: String(body.email).toLowerCase().trim() });
    if (existing) return NextResponse.json({ error: "A client with this email already exists", fields: { email: "Email already in use" } }, { status: 409 });

    const id = randomUUID();
    const now = new Date();
    const clientDoc = {
      id,
      orgId,
      name: String(body.name || body.displayName || "").trim(),
      email: String(body.email || "").toLowerCase().trim(),
      company: String(body.company || "").trim(),
      displayName: String(body.displayName || "").trim(),
      clientType: body.clientType || "",
      salutation: body.salutation || "",
      firstName: body.firstName || "",
      lastName: body.lastName || "",
      workPhone: body.workPhone || "",
      mobile: body.mobile || "",
      gstTreatment: body.gstTreatment || "",
      placeOfSupply: body.placeOfSupply || "",
      panNumber: body.panNumber || "",
      taxPreference: body.taxPreference || "Taxable",
      paymentTerms: body.paymentTerms || "Due on Receipt",
      portalAccess: Boolean(body.portalAccess),
      password: body.portalAccess ? String(body.password || "") : undefined,
      billingAttention: body.billingAttention || "",
      billingCountry: body.billingCountry || "",
      billingStreet1: body.billingStreet1 || "",
      billingStreet2: body.billingStreet2 || "",
      billingCity: body.billingCity || "",
      billingState: body.billingState || "",
      billingPinCode: body.billingPinCode || "",
      billingPhoneCode: body.billingPhoneCode || "",
      billingPhone: body.billingPhone || "",
      billingFax: body.billingFax || "",
      copyBilling: Boolean(body.copyBilling),
      shippingAttention: body.shippingAttention || "",
      shippingCountry: body.shippingCountry || "",
      shippingStreet1: body.shippingStreet1 || "",
      shippingStreet2: body.shippingStreet2 || "",
      shippingCity: body.shippingCity || "",
      shippingState: body.shippingState || "",
      shippingPinCode: body.shippingPinCode || "",
      shippingPhoneCode: body.shippingPhoneCode || "",
      shippingPhone: body.shippingPhone || "",
      shippingFax: body.shippingFax || "",
      contactPersons: (() => { try { return JSON.parse(String(body.contactPersons || "[]")); } catch { return []; } })(),
      customFields: (() => { try { return JSON.parse(String(body.customFields || "[]")); } catch { return []; } })(),
      remarks: body.remarks || "",
      status: "Active",
      projects: 0,
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(collections.clients).insertOne(clientDoc);

    // Create a root folder for the client in the files section
    const folderName = clientDoc.displayName || clientDoc.name || clientDoc.company || "Client";
    const rootFolderId = uuid();
    await db.collection("folders").insertOne({
      id: rootFolderId,
      orgId,
      parentId: null,
      name: folderName,
      path: `/${folderName}`,
      clientId: id,
      createdBy: session.user.id,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const subfolders = ["Documents", "Contracts", "Invoices", "Quotations", "Projects", "Drawings", "Images", "Reports", "Attachments", "Other"];
    for (const sub of subfolders) {
      const subId = uuid();
      await db.collection("folders").insertOne({
        id: subId,
        orgId,
        parentId: rootFolderId,
        name: sub,
        path: `/${folderName}/${sub}`,
        clientId: id,
        createdBy: session.user.id,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await db.collection(collections.activityLogs).insertOne({
      id: uuid(),
      orgId,
      userId: session.user.id,
      action: "folder.created",
      entityType: "folder",
      entityId: rootFolderId,
      description: `Folder "${folderName}" created for client ${clientDoc.name}`,
    });

    return NextResponse.json({ success: true, data: { client: { id, name: clientDoc.name, email: clientDoc.email, company: clientDoc.company, status: clientDoc.status } } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/clients]", err);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
