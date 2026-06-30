import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ShareTokenPageInteractive } from "./page-interactive";

export const dynamic = "force-dynamic";

type ShareFileInfo = {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  hasPassword: boolean;
  allowDownload: boolean;
} | null;

export default async function ShareTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let fileInfo: ShareFileInfo = null;
  const shareLink = await db.collection(collections.shareLinks).findOne({ token, isActive: true });

  if (shareLink) {
    const now = new Date();
    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < now) {
      // expired
      fileInfo = null;
    } else {
      const file = await db.collection(collections.fileAttachments).findOne({ id: shareLink.fileId, deletedAt: null });
      if (file) {
        fileInfo = {
          fileId: file.id as string,
          originalName: (file.originalName as string) || (file.name as string) || "Shared File",
          mimeType: (file.mimeType as string) || "application/octet-stream",
          size: (file.size as number) || 0,
          hasPassword: !!(shareLink.password as string),
          allowDownload: (shareLink.allowDownload as boolean) ?? true,
        };
      }
    }
  }

  return <ShareTokenPageInteractive token={token} fileInfo={fileInfo} />;
}
