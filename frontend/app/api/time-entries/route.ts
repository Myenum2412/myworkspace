import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { orgId, userId, date, startTime, endTime, duration, description, projectId, projectName } = body;

  if (!orgId || !userId || !date || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const entry = {
    id: uuid(),
    orgId,
    userId,
    date,
    startTime: startTime || null,
    endTime: endTime || null,
    duration: duration || 0,
    description,
    projectId: projectId || null,
    projectName: projectName || null,
    billable: true,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  try {
    await db.collection(collections.timeEntries).insertOne(entry);
    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err) {
    console.error("[API /api/time-entries] POST error:", err);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId") || await getUserOrgId(session.user.id, session.user.email);
  const date = searchParams.get("date");
  const projectId = searchParams.get("projectId");

  if (!orgId) {
    return NextResponse.json({ error: "No org" }, { status: 404 });
  }

  const filter: Record<string, unknown> = { orgId };
  if (projectId) {
    filter.projectId = projectId;
  } else {
    filter.userId = session.user.id;
  }
  if (date) filter.date = date;

  try {
    const raw = await db.collection(collections.timeEntries)
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .toArray();

    const entries = (raw as unknown as Record<string, unknown>[]).map((e) => ({
      id: (e.id as string) || (e._id as { toString: () => string }).toString(),
      userId: (e.userId as string) || "",
      date: (e.date as string) || "",
      startTime: (e.startTime as string) || undefined,
      endTime: (e.endTime as string) || undefined,
      duration: (e.duration as number) || 0,
      description: (e.description as string) || "",
      projectId: (e.projectId as string) || undefined,
      projectName: (e.projectName as string) || undefined,
      billable: (e.billable as boolean) ?? true,
      status: (e.status as "pending" | "approved" | "rejected") || "pending",
      createdAt: (e.createdAt as string) || "",
    }));

    return NextResponse.json({ data: entries });
  } catch (err) {
    console.error("[API /api/time-entries] GET error:", err);
      return NextResponse.json({ error: "Could not load time entries" }, { status: 500 });
  }
}
