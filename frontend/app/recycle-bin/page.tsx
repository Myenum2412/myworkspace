import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import RecycleBinInteractive from "./recycle-bin-interactive";

export const dynamic = "force-dynamic";

type RecycledFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  deletedAt: string;
  uploaderName?: string;
};

export default async function RecycleBinPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let files: RecycledFile[] = [];
  if (orgId) {
    const raw = await db.collection(collections.fileAttachments)
      .find({ orgId, deletedAt: { $ne: null } })
      .toArray();

    const uploaderIds = [...new Set((raw as unknown as Record<string, unknown>[]).map((f) => f.uploaderId as string).filter(Boolean))];
    const uploaderNames = new Map<string, string>();
    if (uploaderIds.length > 0) {
      const users = await db.collection(collections.users).find({ id: { $in: uploaderIds } }).project({ id: 1, name: 1 }).toArray();
      for (const u of users as unknown as Record<string, unknown>[]) {
        uploaderNames.set(u.id as string, u.name as string);
      }
    }

    files = (raw as unknown as Record<string, unknown>[]).map((f) => ({
      id: (f.id as string) || "",
      originalName: (f.originalName as string) || "",
      mimeType: (f.mimeType as string) || "",
      size: (f.size as number) || 0,
      createdAt: f.createdAt ? new Date(f.createdAt as string).toISOString() : "",
      deletedAt: f.deletedAt ? new Date(f.deletedAt as string).toISOString() : "",
      uploaderName: uploaderNames.get(f.uploaderId as string) || undefined,
    }));
  }

  return <RecycleBinInteractive files={files} />;
}
