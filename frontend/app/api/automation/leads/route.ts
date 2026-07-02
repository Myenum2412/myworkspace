import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ensureUserOrg } from "@/lib/org";
import { v4 as uuid } from "uuid";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const assignedTo = searchParams.get("assignedTo");
  const search = searchParams.get("search");

  const filter: Record<string, unknown> = { orgId };
  if (status) filter.status = status;
  if (source) filter.source = source;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
    ] as unknown as Record<string, unknown>[];
  }

  const leads = await db.collection(collections.leads)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ data: leads });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);
  const body = await request.json();

  if (!body.name || !body.email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const existing = await db.collection(collections.leads).findOne({
    orgId,
    email: body.email,
  });
  if (existing) {
    return NextResponse.json({ error: "A lead with this email already exists" }, { status: 409 });
  }

  const lead = {
    id: uuid(),
    orgId,
    name: body.name,
    email: body.email,
    phone: body.phone || "",
    company: body.company || "",
    title: body.title || "",
    source: body.source || "manual",
    status: body.status || "new",
    score: body.score || 0,
    assignedTo: body.assignedTo || null,
    tags: body.tags || [],
    notes: body.notes || "",
    customFields: body.customFields || {},
    lastContactedAt: null,
    convertedAt: null,
    convertedTo: null,
    createdBy: session.user.id,
    updatedBy: session.user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collections.leads).insertOne(lead);

  return NextResponse.json({ data: lead }, { status: 201 });
}
