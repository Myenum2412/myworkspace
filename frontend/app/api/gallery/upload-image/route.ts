import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { requireUserOrgId } from "@/lib/org";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await requireUserOrgId(session.user.id, session.user.email);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const galleryId = formData.get("galleryId") as string | null;

  if (!file || !galleryId) {
    return NextResponse.json({ error: "File and galleryId are required" }, { status: 400 });
  }

  const gallery = await db.collection(collections.qrGalleries).findOne({ id: galleryId, orgId });
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const { v4: uuid } = await import("uuid");
  const id = uuid();
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${id}${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "galleries", galleryId);
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  const url = `/uploads/galleries/${galleryId}/${filename}`;

  const image = {
    id,
    galleryId,
    url,
    thumbnailUrl: url,
    filename: file.name,
    createdAt: new Date(),
  };

  await db.collection(collections.galleryImages).insertOne(image);

  await db.collection(collections.qrGalleries).updateOne(
    { id: galleryId },
    { $inc: { imageCount: 1 } }
  );

  return NextResponse.json({ image: { ...image, _id: id } });
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
    return NextResponse.json({ error: "Image ID is required" }, { status: 400 });
  }

  const image = await db.collection(collections.galleryImages).findOne({ id });
  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const gallery = await db.collection(collections.qrGalleries).findOne({ id: image.galleryId, orgId });
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  await db.collection(collections.galleryImages).deleteOne({ id });
  await db.collection(collections.faceToImageMapping).deleteMany({ imageId: id });

  await db.collection(collections.qrGalleries).updateOne(
    { id: image.galleryId },
    { $inc: { imageCount: -1 } }
  );

  return NextResponse.json({ success: true });
}
