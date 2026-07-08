import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const manifestPath = path.join(process.cwd(), "app", "site.webmanifest");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
