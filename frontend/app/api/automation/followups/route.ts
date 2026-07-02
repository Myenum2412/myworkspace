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
  const leadId = searchParams.get("leadId");
  const assignedTo = searchParams.get("assignedTo");
  const type = searchParams.get("type");

  const filter: Record<string, unknown> = { orgId };
  if (status) filter.status = status;
  if (leadId) filter.leadId = leadId;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (type) filter.type = type;

  const followups = await db.collection(collections.followUps)
    .find(filter)
    .sort({ dueAt: 1 })
    .toArray();

  return NextResponse.json({ data: followups });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);
  const body = await request.json();

  if (!body.leadId || !body.type) {
    return NextResponse.json({ error: "Lead ID and type are required" }, { status: 400 });
  }

  const followup = {
    id: uuid(),
    orgId,
    leadId: body.leadId,
    type: body.type,
    subject: body.subject || "",
    message: body.message || "",
    status: body.status || "pending",
    priority: body.priority || "medium",
    dueAt: body.dueAt ? new Date(body.dueAt) : null,
    completedAt: null,
    assignedTo: body.assignedTo || null,
    templateId: body.templateId || null,
    channel: body.channel || "email",
    metadata: body.metadata || {},
    createdBy: session.user.id,
    updatedBy: session.user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collections.followUps).insertOne(followup);

  return NextResponse.json({ data: followup }, { status: 201 });
}
