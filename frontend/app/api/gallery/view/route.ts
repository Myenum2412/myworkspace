import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const gallery = await db.collection("galleries").findOne({ id }) as any;
    if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ gallery: { id: gallery.id || gallery._id?.toString() || "", name: gallery.name || "", description: gallery.description || "", photos: gallery.photos || [] } });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
