import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { requireUserOrgId } from "@/lib/org";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);
  const body = await request.json();

  if (!body.galleryId) {
    return NextResponse.json({ error: "Gallery ID is required" }, { status: 400 });
  }

  const gallery = await db.collection(collections.qrGalleries).findOne({ id: body.galleryId, orgId });
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const { v4: uuid } = await import("uuid");
  const id = uuid();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const doc = {
    id,
    galleryId: body.galleryId,
    token,
    active: true,
    expiresAt,
    createdAt: new Date(),
  };

  await db.collection(collections.galleryAccessTokens).insertOne(doc);

  await db.collection(collections.qrGalleries).updateOne(
    { id: body.galleryId },
    { $inc: { tokenCount: 1 } }
  );

  return NextResponse.json({ token: doc });
}
