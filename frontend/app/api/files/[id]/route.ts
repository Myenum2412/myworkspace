import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { validateOrgMembership } from "@/lib/org";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy a file (or its stream) served by the backend. The backend picks the
 * active storage provider (Cloudflare R2 or local disk) automatically, and
 * supports HTTP range requests and on-demand downloads.
 *
 * Content-Disposition behaviour:
 *  - ?download=true   -> attachment (forces save-as)
 *  - ?preview=true    -> inline (open in browser) with no download prompt
 *  - default          -> inline (view in browser)
 * Download is only forced when the caller explicitly asks for it.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "true";
    const preview = searchParams.get("preview") === "true";

    const cookie = request.headers.get("cookie") || "";
    const range = request.headers.get("range") || "";
    const auth = request.headers.get("authorization") || "";

    const headers: Record<string, string> = { cookie };
    if (range) headers.range = range;
    if (auth) headers.authorization = auth;

    // The backend /:id endpoint streams inline (preview) by default.
    // ?download triggers /download/:id which forces an attachment disposition.
    const backendPath = download
      ? `${API_URL}/api/files/download/${id}`
      : `${API_URL}/api/files/stream/${id}?preview=${preview}`;

    let upstream: Response;
    try {
      upstream = await fetch(backendPath, { headers, cache: "no-store" });
    } catch (err) {
      console.error("[api/files/:id] backend request failed:", err);
      return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
    }

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        text ? { error: "File not found" } : { error: "File request failed" },
        { status: upstream.status },
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = upstream.headers.get("content-disposition");
    const contentLength = upstream.headers.get("content-length");
    const acceptRanges = upstream.headers.get("accept-ranges");
    const contentRange = upstream.headers.get("content-range");

    const outHeaders: HeadersInit = { "Content-Type": contentType };
    if (contentDisposition) outHeaders["Content-Disposition"] = contentDisposition;
    if (contentLength) outHeaders["Content-Length"] = contentLength;
    if (acceptRanges) outHeaders["Accept-Ranges"] = acceptRanges;
    if (contentRange) outHeaders["Content-Range"] = contentRange;
    outHeaders["Cache-Control"] = upstream.headers.get("cache-control") || "public, max-age=3600";

    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { originalName, description } = body;

  if (!originalName && description === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const file = await db.collection(collections.fileAttachments).findOne({ id });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileOrgId = (file.orgId as string) || "";
    if (fileOrgId) {
      const isMember = await validateOrgMembership(session.user.id, fileOrgId);
      if (!isMember) {
        return NextResponse.json({ error: "Not authorized to modify this file" }, { status: 403 });
      }
    }

    const updateFields: Record<string, unknown> = {};
    if (originalName) updateFields.originalName = originalName;
    if (description !== undefined) updateFields.description = description;

    const result = await db.collection(collections.fileAttachments).findOneAndUpdate(
      { id },
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}
