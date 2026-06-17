import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  const totalTasks = await db.collection(collections.tasks).countDocuments({ orgId });

  const completedTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "done" });

  const inProgressTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "in_progress" });

  const overdueTasks = await db.collection(collections.tasks).countDocuments({
    orgId,
    dueDate: { $lt: Date.now() },
    status: { $ne: "done" },
  });

  const activeMembers = await db.collection(collections.orgMembers).countDocuments({ orgId });

  const recentActivity = await db.collection(collections.activityLogs).countDocuments({
    orgId,
    createdAt: { $gt: Date.now() - 86400000 },
  });

  return NextResponse.json({
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    activeMembers,
    recentActivity,
  });
}
