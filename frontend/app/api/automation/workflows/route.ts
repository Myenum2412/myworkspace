import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ensureUserOrg } from "@/lib/org";
import { v4 as uuid } from "uuid";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);

  const workflows = await db.collection(collections.workflows)
    .find({ orgId })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ data: workflows });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await ensureUserOrg(session.user.id, session.user.email);
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const workflow = {
    id: uuid(),
    orgId,
    name: body.name,
    description: body.description || "",
    status: body.status || "draft",
    steps: body.steps || [],
    triggers: body.triggers || [],
    tags: body.tags || [],
    createdBy: session.user.id,
    updatedBy: session.user.id,
    lastRunAt: null,
    lastRunStatus: null,
    runCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collections.workflows).insertOne(workflow);

  return NextResponse.json({ data: workflow }, { status: 201 });
}
