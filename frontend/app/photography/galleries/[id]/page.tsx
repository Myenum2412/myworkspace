import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { requireUserOrgId } from "@/lib/org";
import { GalleryDetailClient } from "./gallery-detail-client";

export const dynamic = "force-dynamic";

export default async function GalleryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await requireUserOrgId(session.user.id, session.user.email);

  const gallery = await db.collection(collections.qrGalleries).findOne({ id, orgId });
  if (!gallery) notFound();

  const images = await db.collection(collections.galleryImages)
    .find({ galleryId: id })
    .sort({ createdAt: -1 })
    .toArray();

  const tokens = await db.collection(collections.galleryAccessTokens)
    .find({ galleryId: id })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <GalleryDetailClient
      gallery={JSON.parse(JSON.stringify(gallery))}
      images={JSON.parse(JSON.stringify(images))}
      tokens={JSON.parse(JSON.stringify(tokens))}
    />
  );
}
