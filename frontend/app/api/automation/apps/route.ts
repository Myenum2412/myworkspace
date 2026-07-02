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
  const category = searchParams.get("category");

  const filter: Record<string, unknown> = { orgId };
  if (category) filter.category = category;

  const apps = await db.collection(collections.automationApps)
    .find(filter)
    .sort({ name: 1 })
    .toArray();

  return NextResponse.json({ data: apps });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);
  const body = await request.json();

  if (!body.name || !body.type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
  }

  const app = {
    id: uuid(),
    orgId,
    name: body.name,
    type: body.type,
    description: body.description || "",
    category: body.category || "general",
    icon: body.icon || "",
    config: body.config || {},
    credentials: body.credentials || {},
    status: body.status || "disconnected",
    connectedAt: null,
    disconnectedAt: null,
    lastUsedAt: null,
    isEnabled: body.isEnabled !== undefined ? body.isEnabled : true,
    metadata: body.metadata || {},
    createdBy: session.user.id,
    updatedBy: session.user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collections.automationApps).insertOne(app);

  return NextResponse.json({ data: app }, { status: 201 });
}
