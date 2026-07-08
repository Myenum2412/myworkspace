import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

const VALID_STATUSES = ["available", "busy", "break", "meeting", "offline", "remote"];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || session.user.id;

    const user = await db.collection(collections.users).findOne(
      { id: userId },
      { projection: { status: 1, statusNote: 1, statusUpdatedAt: 1, customStatus: 1 } }
    ) as { status?: string; statusNote?: string; statusUpdatedAt?: Date; customStatus?: string } | null;

    return NextResponse.json({
      data: {
        status: user?.status || "offline",
        statusNote: user?.statusNote || "",
        statusUpdatedAt: user?.statusUpdatedAt || null,
        customStatus: user?.customStatus || "",
      },
    });
  } catch {
    return NextResponse.json({ data: { status: "offline", statusNote: "", statusUpdatedAt: null, customStatus: "" } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status, statusNote, customStatus } = await request.json();
    const targetUserId = session.user.id;

    let normalizedStatus = status || "available";
    if (VALID_STATUSES.includes(normalizedStatus)) {
      // valid
    } else if (normalizedStatus === "online") {
      normalizedStatus = "available";
    } else if (normalizedStatus) {
      // custom status
    }

    const updateFields: Record<string, unknown> = {
      status: normalizedStatus,
      statusUpdatedAt: new Date(),
    };

    if (statusNote !== undefined) updateFields.statusNote = statusNote;
    if (customStatus !== undefined) updateFields.customStatus = customStatus;

    await db.collection(collections.users).updateOne(
      { id: targetUserId },
      { $set: updateFields }
    );

    return NextResponse.json({ success: true, data: { status: normalizedStatus, statusNote, statusUpdatedAt: updateFields.statusUpdatedAt, customStatus } });
  } catch {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
