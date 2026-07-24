import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const shareLink = await db.collection(collections.shareLinks).findOne({ token, isActive: true });
    if (!shareLink) return NextResponse.json({ fileInfo: null });
    return NextResponse.json({ fileInfo: { fileId: shareLink.fileId, originalName: shareLink.originalName, mimeType: shareLink.mimeType, size: shareLink.size, hasPassword: !!shareLink.password, allowDownload: shareLink.allowDownload !== false } });
  } catch { return NextResponse.json({ fileInfo: null }); }
}
