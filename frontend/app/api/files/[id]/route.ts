import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { getFilePath } from "@/lib/storage";
import fs from "fs";

export async function GET(
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
  const { searchParams } = new URL(request.url);
  const download = searchParams.get("download") === "true";

  try {
    const file = await db.collection(collections.fileAttachments).findOne({ id });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const path = getFilePath(file.storagePath);
    if (!fs.existsSync(path)) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    const buffer = fs.readFileSync(path);
    const ext = file.originalName?.split(".").pop() || "";
    const mime = file.mimeType || "application/octet-stream";

    if (download) {
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `attachment; filename="${file.originalName}"`,
          "Content-Length": String(buffer.length),
        },
      });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${file.originalName}"`,
        "Content-Length": String(buffer.length),
      },
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
