import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { notFound } from "next/navigation";
import { GalleryAccessClient } from "./access-client";

export const dynamic = "force-dynamic";

export default async function GalleryAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const tokenDoc = await db.collection(collections.galleryAccessTokens).findOne({ token });

  if (!tokenDoc || !tokenDoc.active) {
    notFound();
  }

  if (tokenDoc.expiresAt && new Date(tokenDoc.expiresAt) < new Date()) {
    await db.collection(collections.galleryAccessTokens).updateOne(
      { token },
      { $set: { active: false } }
    );
    notFound();
  }

  const gallery = await db.collection(collections.qrGalleries).findOne({ id: tokenDoc.galleryId });
  if (!gallery) notFound();

  return (
    <GalleryAccessClient
      token={token}
      galleryId={tokenDoc.galleryId}
      galleryName={gallery.name as string}
    />
  );
}
