import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { notFound, redirect } from "next/navigation";
import { GalleryViewClient } from "./view-client";

export const dynamic = "force-dynamic";

export default async function GalleryViewPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionToken } = await searchParams;
  if (!sessionToken) redirect("/");

  const sessionDoc = await db.collection(collections.galleryAccessTokens).findOne({
    token: sessionToken,
    type: "session",
    active: true,
  });

  if (!sessionDoc) {
    notFound();
  }

  if (sessionDoc.expiresAt && new Date(sessionDoc.expiresAt) < new Date()) {
    await db.collection(collections.galleryAccessTokens).updateOne(
      { token: sessionToken },
      { $set: { active: false } }
    );
    notFound();
  }

  const galleryId = sessionDoc.galleryId as string;
  const personId = sessionDoc.personId as string;

  const gallery = await db.collection(collections.qrGalleries).findOne({ id: galleryId });
  if (!gallery) notFound();

  const imageIds = await db.collection(collections.faceToImageMapping)
    .find({ personId })
    .project({ imageId: 1 })
    .toArray();

  const ids = imageIds.map((m) => m.imageId);
  const images = ids.length > 0
    ? await db.collection(collections.galleryImages)
        .find({ id: { $in: ids } })
        .sort({ createdAt: -1 })
        .toArray()
    : [];

  const visitor = await db.collection(collections.visitorInfo).findOne({
    matchedPersonId: personId,
    galleryId,
  });

  return (
    <GalleryViewClient
      galleryName={gallery.name as string}
      personName={visitor?.fullName as string || "Guest"}
      images={JSON.parse(JSON.stringify(images))}
      sessionExpiresAt={(sessionDoc.expiresAt as Date).toISOString()}
    />
  );
}
