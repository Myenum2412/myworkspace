import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { requireUserOrgId } from "@/lib/org";
import crypto from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);

  const docs = await db
    .collection(collections.webhookConfigs)
    .find({ orgId })
    .project({ secret: 0 })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    data: docs.map((doc) => ({
      id: doc.id || doc._id?.toString(),
      integration: doc.integration,
      webhookUrl: doc.webhookUrl,
      enabled: doc.enabled,
      events: doc.events,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);
  const body = await req.json();
  const { integration, webhookUrl, events } = body;

  if (!integration || !webhookUrl) {
    return NextResponse.json(
      { error: "Missing required fields: integration, webhookUrl" },
      { status: 400 }
    );
  }

  const secret = crypto.randomBytes(32).toString("hex");

  const existing = await db.collection(collections.webhookConfigs).findOne({
    orgId,
    integration,
  });

  if (existing) {
    await db.collection(collections.webhookConfigs).updateOne(
      { _id: existing._id },
      {
        $set: {
          webhookUrl,
          events: events || [],
          enabled: true,
          updatedAt: new Date(),
        },
      }
    );
    return NextResponse.json({ success: true, id: existing.id || existing._id?.toString() });
  }

  const id = crypto.randomUUID();
  await db.collection(collections.webhookConfigs).insertOne({
    id,
    orgId,
    userId: session.user.id,
    integration,
    webhookUrl,
    secret,
    events: events || [],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return NextResponse.json({ success: true, id });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const integration = searchParams.get("integration");

  const query: Record<string, unknown> = { orgId };
  if (id) query.id = id;
  else if (integration) query.integration = integration;
  else return NextResponse.json({ error: "Missing id or integration" }, { status: 400 });

  await db.collection(collections.webhookConfigs).deleteMany(query);

  return NextResponse.json({ success: true });
}
