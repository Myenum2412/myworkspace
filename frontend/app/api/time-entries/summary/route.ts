import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) {
    return NextResponse.json({ error: "No org" }, { status: 404 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const fourteenDaysAgo = new Date(sevenDaysAgo);
  fourteenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const match = { orgId };

  const [totalRes, prevRes, weeklyAgg, topMembers] = await Promise.all([
    db.collection(collections.timeEntries).aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalHours: { $sum: "$duration" },
          billableHours: { $sum: { $cond: ["$billable", "$duration", 0] } },
          totalEntries: { $sum: 1 },
        },
      },
    ]).toArray(),
    db.collection(collections.timeEntries).aggregate([
      { $match: { ...match, date: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } } },
      { $group: { _id: null, totalHours: { $sum: "$duration" } } },
    ]).toArray(),
    db.collection(collections.timeEntries).aggregate([
      { $match: { ...match, date: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          hours: { $sum: "$duration" },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection(collections.timeEntries).aggregate([
      { $match: { ...match, date: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: "$userId",
          hours: { $sum: "$duration" },
          billable: { $sum: { $cond: ["$billable", "$duration", 0] } },
        },
      },
      { $sort: { hours: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: collections.users,
          localField: "_id",
          foreignField: "id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          hours: 1,
          billable: 1,
          name: "$user.name",
        },
      },
    ]).toArray(),
  ]);

  const totals = totalRes[0] || { totalHours: 0, billableHours: 0, totalEntries: 0 };
  const prevTotal = prevRes[0]?.totalHours || 0;
  const weeklyChange = prevTotal > 0 ? ((totals.totalHours - prevTotal) / prevTotal) * 100 : 0;

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData: { day: string; hours: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const found = weeklyAgg.find((w) => w._id === key);
    weeklyData.push({ day: dayLabels[d.getDay()], hours: found?.hours || 0 });
  }

  const activeProjects = await db.collection(collections.projects).countDocuments({ orgId });
  const teamMembers = await db.collection(collections.orgMembers).countDocuments({ orgId });
  const avgDailyHours = teamMembers > 0 ? totals.totalHours / 7 / teamMembers : 0;
  const utilization = totals.totalHours > 0 ? (totals.billableHours / totals.totalHours) * 100 : 0;

  return NextResponse.json({
    totalHours: totals.totalHours,
    billableHours: totals.billableHours,
    totalEntries: totals.totalEntries,
    avgDailyHours: Math.round(avgDailyHours * 10) / 10,
    activeProjects,
    teamMembers,
    weeklyChange: Math.round(weeklyChange * 10) / 10,
    utilization: Math.round(utilization),
    weeklyData,
    topMembers: topMembers.map((m: any, i: number) => ({
      rank: i + 1,
      name: m.name || "Unknown",
      hours: m.hours,
      billable: m.billable,
    })),
  });
}
