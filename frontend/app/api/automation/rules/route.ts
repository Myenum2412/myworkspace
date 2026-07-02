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
  const triggerType = searchParams.get("triggerType");
  const appId = searchParams.get("appId");
  const search = searchParams.get("search");

  const filter: Record<string, unknown> = { orgId };
  if (status) filter.status = status;
  if (triggerType) filter["trigger.type"] = triggerType;
  if (appId) filter.appId = appId;
  if (search) filter.name = { $regex: search, $options: "i" } as unknown as string;

  const rules = await db.collection(collections.automationRules)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ data: rules });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const rule = {
    id: uuid(),
    orgId,
    name: body.name,
    description: body.description || "",
    trigger: body.trigger || {},
    conditions: body.conditions || [],
    actions: body.actions || [],
    status: body.status || "active",
    priority: body.priority || 0,
    cooldownMinutes: body.cooldownMinutes || 0,
    lastTriggeredAt: null,
    triggerCount: 0,
    appId: body.appId || null,
    createdBy: session.user.id,
    updatedBy: session.user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collections.automationRules).insertOne(rule);

  return NextResponse.json({ data: rule }, { status: 201 });
}
