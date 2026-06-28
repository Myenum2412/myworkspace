import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) {
    return NextResponse.json({ error: "No org" }, { status: 404 });
  }
  const org = await db.collection(collections.organizations).findOne({ id: orgId });
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    storageLimit: (org as any).storageLimit ?? 0,
    memberLimit: (org as any).memberLimit ?? 0,
    projectLimit: (org as any).projectLimit ?? 0,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) {
    return NextResponse.json({ error: "No org" }, { status: 404 });
  }
  const body = (await req.json()) as {
    storageLimit?: number;
    memberLimit?: number;
    projectLimit?: number;
  };
  const update: Record<string, number> = {};
  if (typeof body.storageLimit === "number") update.storageLimit = body.storageLimit;
  if (typeof body.memberLimit === "number") update.memberLimit = body.memberLimit;
  if (typeof body.projectLimit === "number") update.projectLimit = body.projectLimit;

  await db.collection(collections.organizations).updateOne({ id: orgId }, { $set: update });
  return NextResponse.json({ ok: true, ...update });
}
