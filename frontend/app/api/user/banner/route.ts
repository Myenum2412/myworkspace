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
  let bannerUrl = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("banner") as File | null;
    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Banner must be under 5MB" }, { status: 400 });
      }
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "File must be an image" }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      bannerUrl = `data:${file.type};base64,${base64}`;
      console.log(`[banner] uploaded file: size=${file.size} type=${file.type}`);
    } else {
      return NextResponse.json({ error: "No banner file provided" }, { status: 400 });
    }
  } else {
    let body: { url?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    bannerUrl = body.url || "";
    console.log(`[banner] JSON update: url length=${bannerUrl.length}`);
  }

  try {
    const userQuery: { $or: Record<string, unknown>[] } = { $or: [{ id: userId }] };
    if (ObjectId.isValid(userId)) {
      userQuery.$or!.push({ _id: new ObjectId(userId) });
    } else {
      userQuery.$or!.push({ _id: userId });
    }
    const result = await db.collection("users").updateOne(userQuery as never, { $set: { bannerUrl, updatedAt: new Date() } });
    if (result.matchedCount === 0) {
      console.warn(`[banner] user not found for userId=${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log(`[banner] updated for userId=${userId}`);
    return NextResponse.json({ bannerUrl });
  } catch (e) {
    console.error("[banner] Failed:", e);
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
  }
}
