import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import TimeTrackerOverview from "./time-tracker-overview";

export const dynamic = "force-dynamic";

export default async function TimeTrackerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) {
    return <TimeTrackerOverview data={null} />;
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);

  const rawEntries = await db.collection(collections.timeEntries)
    .find({ orgId, userId: session.user.id, date: { $gte: oneWeekAgo.toISOString().slice(0, 10) } })
    .sort({ date: -1, createdAt: -1 })
    .toArray() as unknown as Record<string, unknown>[];

  const entries = rawEntries.map((e) => ({
    id: (e.id as string) || String(e._id || ""),
    userId: (e.userId as string) || "",
    date: (e.date as string) || "",
    startTime: (e.startTime as string) || undefined,
    endTime: (e.endTime as string) || undefined,
    duration: (e.duration as number) || 0,
    description: (e.description as string) || "",
    projectId: (e.projectId as string) || undefined,
    projectName: (e.projectName as string) || undefined,
    billable: (e.billable as boolean) ?? true,
    status: (e.status as string) || "pending",
    createdAt: (e.createdAt as string) || "",
  }));

  return <TimeTrackerOverview data={entries} />;
}
