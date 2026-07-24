import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const shareLink = await db.collection(collections.shareLinks).findOne({ token, isActive: true });
    if (!shareLink) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ shareLink: { fileId: shareLink.fileId, galleryId: shareLink.galleryId, expiresAt: shareLink.expiresAt } });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
