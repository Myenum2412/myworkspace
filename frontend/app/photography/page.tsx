import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { requireUserOrgId } from "@/lib/org";
import { PhotographyPageClient } from "./photography-client";

export const dynamic = "force-dynamic";

export default async function PhotographyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await requireUserOrgId(session.user.id, session.user.email);

  const galleries = await db.collection(collections.qrGalleries)
    .find({ orgId })
    .sort({ createdAt: -1 })
    .toArray();

  return <PhotographyPageClient orgId={orgId} galleries={JSON.parse(JSON.stringify(galleries))} />;
}
