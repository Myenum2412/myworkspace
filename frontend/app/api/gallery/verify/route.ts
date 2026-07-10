import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = formData.get("token") as string | null;
  const galleryId = formData.get("galleryId") as string | null;
  const fullName = formData.get("fullName") as string | null;
  const email = formData.get("email") as string | null;
  const phone = formData.get("phone") as string | null;
  const selfie = formData.get("selfie") as File | null;

  if (!token || !galleryId || !fullName || !email || !phone || !selfie) {
    return NextResponse.json({ success: false, message: "All fields are required" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, message: "Invalid email format" }, { status: 400 });
  }

  if (!/^\+?[\d\s\-()]{7,20}$/.test(phone)) {
    return NextResponse.json({ success: false, message: "Invalid phone number" }, { status: 400 });
  }

  const tokenDoc = await db.collection(collections.galleryAccessTokens).findOne({ token });
  if (!tokenDoc || !tokenDoc.active) {
    return NextResponse.json({ success: false, message: "Invalid or expired access token" }, { status: 403 });
  }

  if (tokenDoc.expiresAt && new Date(tokenDoc.expiresAt) < new Date()) {
    return NextResponse.json({ success: false, message: "Access token has expired" }, { status: 403 });
  }

  const gallery = await db.collection(collections.qrGalleries).findOne({ id: galleryId });
  if (!gallery) {
    return NextResponse.json({ success: false, message: "Gallery not found" }, { status: 404 });
  }

  const orgId = gallery.orgId as string;

  const { v4: uuid } = await import("uuid");
  const visitorId = uuid();

  const selfieDir = path.join(process.cwd(), "public", "uploads", "selfies", galleryId);
  await mkdir(selfieDir, { recursive: true });
  const selfieFilename = `${visitorId}.jpg`;
  const buffer = Buffer.from(await selfie.arrayBuffer());
  await writeFile(path.join(selfieDir, selfieFilename), buffer);
  const selfieUrl = `/uploads/selfies/${galleryId}/${selfieFilename}`;

  await db.collection(collections.visitorInfo).insertOne({
    id: visitorId,
    galleryId,
    orgId,
    fullName,
    email,
    phone,
    selfieUrl,
    tokenUsed: token,
    verified: false,
    createdAt: new Date(),
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
  });

  const minConfidence = 0.6;
  const persons = await db.collection(collections.persons).find({ galleryId }).toArray();
  let matchedPersonId: string | null = null;
  let bestConfidence = 0;

  for (const person of persons) {
    const embeddings = await db.collection(collections.faceEmbeddings)
      .find({ personId: person.id })
      .toArray();

    for (const emb of embeddings) {
      const confidence = computeSimilarity(buffer, emb.embedding);
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        matchedPersonId = person.id;
      }
    }
  }

  if (!matchedPersonId || bestConfidence < minConfidence) {
    await db.collection(collections.accessLogs).insertOne({
      id: uuid(),
      galleryId,
      orgId,
      visitorId,
      status: "rejected",
      reason: "No matching face found",
      confidence: bestConfidence,
      ip: request.headers.get("x-forwarded-for") || "unknown",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: false,
      message: "No matching photos were found.",
      confidence: bestConfidence,
    });
  }

  const sessionToken = uuid();
  const sessionExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await db.collection(collections.galleryAccessTokens).insertOne({
    id: uuid(),
    galleryId,
    token: sessionToken,
    type: "session",
    personId: matchedPersonId,
    active: true,
    expiresAt: sessionExpiresAt,
    createdAt: new Date(),
  });

  await db.collection(collections.visitorInfo).updateOne(
    { id: visitorId },
    { $set: { verified: true, matchedPersonId } }
  );

  await db.collection(collections.accessLogs).insertOne({
    id: uuid(),
    galleryId,
    orgId,
    visitorId,
    personId: matchedPersonId,
    status: "approved",
    confidence: bestConfidence,
    sessionToken,
    ip: request.headers.get("x-forwarded-for") || "unknown",
    createdAt: new Date(),
  });

  return NextResponse.json({
    success: true,
    sessionToken,
    personId: matchedPersonId,
    confidence: bestConfidence,
  });
}

function computeSimilarity(_embedding1: Buffer, _embedding2: number[]): number {
  const sample1 = Array.from(_embedding1.slice(0, 128));
  const sample2 = _embedding2.slice(0, 128);

  const maxLen = Math.min(sample1.length, sample2.length);
  if (maxLen === 0) return 0;

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < maxLen; i++) {
    dotProduct += sample1[i] * sample2[i];
    mag1 += sample1[i] * sample1[i];
    mag2 += sample2[i] * sample2[i];
  }

  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}
