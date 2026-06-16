import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  const allTasks = db
    .select({ count: count() })
    .from(schema.tasks)
    .where(eq(schema.tasks.orgId, orgId))
    .all();

  const completedTasks = db
    .select({ count: count() })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.orgId, orgId), eq(schema.tasks.status, "done")))
    .all();

  const inProgressTasks = db
    .select({ count: count() })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.orgId, orgId), eq(schema.tasks.status, "in_progress")))
    .all();

  const overdueTasks = db
    .select({ count: count() })
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.orgId, orgId),
        sql`${schema.tasks.dueDate} < ${Date.now()}`,
        sql`${schema.tasks.status} != 'done'`
      )
    )
    .all();

  const activeMembers = db
    .select({ count: count() })
    .from(schema.orgMembers)
    .where(eq(schema.orgMembers.orgId, orgId))
    .all();

  const recentActivity = db
    .select({ count: count() })
    .from(schema.activityLogs)
    .where(
      and(
        eq(schema.activityLogs.orgId, orgId),
        sql`${schema.activityLogs.createdAt} > ${Date.now() - 86400000}`
      )
    )
    .all();

  return NextResponse.json({
    totalTasks: allTasks[0]?.count ?? 0,
    completedTasks: completedTasks[0]?.count ?? 0,
    inProgressTasks: inProgressTasks[0]?.count ?? 0,
    overdueTasks: overdueTasks[0]?.count ?? 0,
    activeMembers: activeMembers[0]?.count ?? 0,
    recentActivity: recentActivity[0]?.count ?? 0,
  });
}
