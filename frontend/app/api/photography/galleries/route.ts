import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { requireUserOrgId } from "@/lib/org";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);

  const galleries = await db.collection(collections.qrGalleries)
    .find({ orgId })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ galleries });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);
  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Gallery name is required" }, { status: 400 });
  }

  const { v4: uuid } = await import("uuid");
  const id = uuid();

  const gallery = {
    id,
    orgId,
    name: body.name.trim(),
    description: body.description?.trim() || "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collections.qrGalleries).insertOne(gallery);

  return NextResponse.json({ gallery: { ...gallery, _id: id } });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Gallery ID is required" }, { status: 400 });
  }

  const gallery = await db.collection(collections.qrGalleries).findOne({ id, orgId });
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  await db.collection(collections.qrGalleries).deleteOne({ id });
  await db.collection(collections.galleryAccessTokens).deleteMany({ galleryId: id });
  await db.collection(collections.galleryImages).deleteMany({ galleryId: id });
  await db.collection(collections.faceToImageMapping).deleteMany({ galleryId: id });
  await db.collection(collections.faceEmbeddings).deleteMany({ galleryId: id });
  await db.collection(collections.persons).deleteMany({ galleryId: id });
  await db.collection(collections.visitorInfo).deleteMany({ galleryId: id });

  return NextResponse.json({ success: true });
}
