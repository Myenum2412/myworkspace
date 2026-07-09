import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const contentType = request.headers.get("content-type") || "";
  let imageUrl = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
      }
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "File must be an image" }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      imageUrl = `data:${file.type};base64,${base64}`;
      console.log(`[profile-image] uploaded file: size=${file.size} type=${file.type}`);
    } else {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }
  } else {
    let body: { image?: string; url?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    // Accept both `image` and `url` keys for backward compat
    imageUrl = body.image || body.url || "";
    console.log(`[profile-image] JSON update: url length=${imageUrl.length}`);
  }

  try {
    const userQuery: { $or: Record<string, unknown>[] } = { $or: [{ id: userId }] };
    if (ObjectId.isValid(userId)) {
      userQuery.$or!.push({ _id: new ObjectId(userId) });
    } else {
      userQuery.$or!.push({ _id: userId });
    }
    const result = await db.collection("users").updateOne(userQuery as never, { $set: { image: imageUrl, updatedAt: new Date() } });
    if (result.matchedCount === 0) {
      console.warn(`[profile-image] user not found for userId=${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log(`[profile-image] updated for userId=${userId}`);

    // Also update organization logo for invoice PDFs
    try {
      const member = await db.collection("org_members").findOne({ userId });
      if (member?.orgId) {
        await db.collection("organizations").updateOne(
          { $or: [{ id: member.orgId }, { _id: new ObjectId(member.orgId) }] },
          { $set: { logo: imageUrl, updatedAt: new Date() } }
        );
        console.log(`[profile-image] organization logo updated for orgId=${member.orgId}`);
      }
    } catch (orgErr) {
      console.warn("[profile-image] Failed to update organization logo:", orgErr);
    }

    return NextResponse.json({ image: imageUrl });
  } catch (e) {
    console.error("[profile-image] Failed:", e);
    return NextResponse.json({ error: "Failed to update profile image" }, { status: 500 });
  }
}
