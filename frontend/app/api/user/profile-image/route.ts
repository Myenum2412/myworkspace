import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";

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

  const contentType = request.headers.get("content-type") || "";
  let imageUrl = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (file) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      imageUrl = `data:${file.type};base64,${base64}`;
    }
  } else {
    const body = await request.json();
    imageUrl = body.url || "";
  }

  try {
    await db.collection("users").updateOne(
      { id: session.user.id },
      { $set: { image: imageUrl, updatedAt: new Date() } }
    );
    return NextResponse.json({ image: imageUrl });
  } catch (e) {
    console.error("Failed to update profile image:", e);
    return NextResponse.json({ error: "Failed to update profile image" }, { status: 500 });
  }
}
