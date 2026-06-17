import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BANNERS_DIR = path.resolve(process.cwd(), "public", "banners");

function ensureDir() {
  if (!fs.existsSync(BANNERS_DIR)) {
    fs.mkdirSync(BANNERS_DIR, { recursive: true });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .collection(collections.users)
    .find({ id: session.user.id })
    .toArray();

  return NextResponse.json({ bannerUrl: dbUser?.bannerUrl || null });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("banner") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    ensureDir();
    const ext = path.extname(file.name) || ".jpg";
    const fileName = `${session.user.id}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(BANNERS_DIR, fileName), buffer);
    const bannerUrl = `/banners/${fileName}`;

    await db.collection(collections.users).updateOne(
      { id: session.user.id },
      { $set: { bannerUrl, updatedAt: new Date() } }
    );

    return NextResponse.json({ bannerUrl });
  }

  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  await db.collection(collections.users).updateOne(
    { id: session.user.id },
    { $set: { bannerUrl: url, updatedAt: new Date() } }
  );

  return NextResponse.json({ bannerUrl: url });
}
