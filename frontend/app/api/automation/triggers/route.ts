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
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const workflowId = searchParams.get("workflowId");

  const filter: Record<string, unknown> = { orgId };
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (workflowId) filter.workflowId = workflowId;

  const triggers = await db.collection(collections.automationTriggers)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ data: triggers });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);
  const body = await request.json();

  if (!body.name || !body.type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
  }

  const trigger = {
    id: uuid(),
    orgId,
    name: body.name,
    type: body.type,
    description: body.description || "",
    config: body.config || {},
    conditions: body.conditions || [],
    workflowId: body.workflowId || null,
    status: body.status || "active",
    cooldownSeconds: body.cooldownSeconds || 0,
    lastFiredAt: null,
    fireCount: 0,
    createdBy: session.user.id,
    updatedBy: session.user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collections.automationTriggers).insertOne(trigger);

  return NextResponse.json({ data: trigger }, { status: 201 });
}
