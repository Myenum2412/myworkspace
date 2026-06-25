import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewUsersChart } from "@/components/NewUsersChart";
import { MonthlyRevenueChart } from "@/components/MonthlyRevenueChart";
import { DashboardSignupsTable } from "@/components/dashboard-signups";
import { UsersIcon, ClipboardListIcon, ActivityIcon, Building2Icon, CheckCircle2Icon, ClockIcon, UserPlusIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organization Dashboard" };

const getOrgMetrics = cache(async (orgId: string) => {
  const memberCount = await db.collection(collections.orgMembers).countDocuments({ orgId });
  const taskCount = await db.collection(collections.tasks).countDocuments({ orgId });
  const completedTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "done" });
  const inProgressTasks = await db.collection(collections.tasks).countDocuments({ orgId, status: "in_progress" });
  const activityCount = await db.collection(collections.activityLogs).countDocuments({ orgId });
  return { memberCount, taskCount, completedTasks, inProgressTasks, activityCount };
});

const getAllMetrics = cache(async () => {
  const orgCount = await db.collection(collections.organizations).countDocuments({});
  const memberCount = await db.collection(collections.orgMembers).countDocuments({});
  const taskCount = await db.collection(collections.tasks).countDocuments({});
  const completedTasks = await db.collection(collections.tasks).countDocuments({ status: "done" });
  const inProgressTasks = await db.collection(collections.tasks).countDocuments({ status: "in_progress" });
  const activityCount = await db.collection(collections.activityLogs).countDocuments({});
  return { orgCount, memberCount, taskCount, completedTasks, inProgressTasks, activityCount };
});

const getUsersByState = cache(async (orgId?: string | null) => {
  const pipeline = orgId
    ? [
        { $match: { orgId } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $match: { "user.state": { $exists: true, $nin: [null, ""] } } },
        {
          $group: {
            _id: "$user.state",
            users: { $sum: 1 },
          },
        },
        { $sort: { users: -1 } },
      ]
    : [
        { $match: { state: { $exists: true, $nin: [null, ""] } } },
        {
          $group: {
            _id: "$state",
            users: { $sum: 1 },
          },
        },
        { $sort: { users: -1 } },
      ];
  const cursor = await db
    .collection(orgId ? collections.orgMembers : collections.users)
    .aggregate(pipeline);
  const raw = await cursor.toArray();
  return raw.map((r) => ({
    state: r._id as string,
    users: r.users as number,
  }));
});

const getMonthlyRevenue = cache(async (orgId?: string | null) => {
  const match = orgId ? { orgId } : {};
  const pipeline = [
    { $match: { status: "completed", ...match } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        revenue: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ];
  try {
    const cursor = await db
      .collection(collections.payments)
      .aggregate(pipeline);
    const raw = await cursor.toArray();
    if (raw.length === 0) return [];
    return raw.map((r) => ({
      month: r._id as string,
      revenue: r.revenue as number,
    }));
  } catch {
    return [];
  }
});

const getRecentUsers = cache(async (orgId?: string | null) => {
  const cursor = await db.collection(
    orgId ? collections.orgMembers : collections.users,
  ).find(
    orgId ? { orgId } : {},
    { sort: { createdAt: -1 }, limit: 10, projection: orgId ? { userId: 1, joinedAt: 1 } : { id: 1, name: 1, email: 1, role: 1, status: 1, createdAt: 1, provider: 1, image: 1, emailVerified: 1, lastLogin: 1 } },
  );
  const raw = await cursor.toArray();

  if (orgId) {
    const userIds = raw.map((r: Record<string, unknown>) => r.userId as string);
    const users = await (await db.collection(collections.users).find(
      { id: { $in: userIds } },
      { projection: { id: 1, name: 1, email: 1, role: 1, status: 1, createdAt: 1, provider: 1, image: 1, emailVerified: 1, lastLogin: 1 } },
    )).toArray();
    const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));

    return raw.map((r: Record<string, unknown>) => {
      const u = userMap.get(r.userId as string) as Record<string, unknown> | undefined;
      return {
        userId: (r.userId as string) || "",
        name: (u?.name as string) || "Unknown",
        email: (u?.email as string) || "",
        role: (u?.role as string) || "",
        status: (u?.status as string) || "offline",
        provider: (u?.provider as string) || "credentials",
        avatar: (u?.image as string) || "",
        emailVerified: Boolean(u?.emailVerified),
        createdAt: (r.joinedAt as string) || (u?.createdAt as string) || "",
        lastLogin: (u?.lastLogin as string) || undefined,
        orgName: undefined,
        orgId: orgId || undefined,
      };
    });
  }

  // Non-super-admin path: fetch users, then look up their org membership
  const userIds = raw.map((r: Record<string, unknown>) => (r.id as string) || String(r._id));

  // Look up org membership for all users
  const memberships = await db.collection(collections.orgMembers).find(
    { userId: { $in: userIds } },
    { projection: { userId: 1, orgId: 1 } },
  ).toArray();
  const memberOrgMap = new Map(memberships.map((m: Record<string, unknown>) => [m.userId, m.orgId]));

  // Look up org names
  const orgIds = [...new Set(memberships.map((m: Record<string, unknown>) => String(m.orgId)))];
  const orgs = orgIds.length > 0
    ? await (await db.collection(collections.organizations).find({ id: { $in: orgIds } }, { projection: { id: 1, name: 1 } })).toArray()
    : [];
  const orgMap = new Map(orgs.map((o: Record<string, unknown>) => [o.id, o.name]));

  return raw.map((r: Record<string, unknown>) => {
    const userId = (r.id as string) || String(r._id);
    const userOrgId = memberOrgMap.get(userId) as string | undefined;
    return {
      userId,
      name: (r.name as string) || "",
      email: (r.email as string) || "",
      role: (r.role as string) || "",
      status: (r.status as string) || "offline",
      provider: (r.provider as string) || "credentials",
      avatar: (r.image as string) || "",
      emailVerified: Boolean(r.emailVerified),
      createdAt: (r.createdAt as string) || "",
      lastLogin: (r.lastLogin as string) || undefined,
      orgName: userOrgId ? (orgMap.get(userOrgId) as string || undefined) : undefined,
      orgId: userOrgId || undefined,
    };
  });
});

export default async function OrgDashboardPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";

  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let metrics: Awaited<ReturnType<typeof getOrgMetrics>>;
  let newUsersData: { state: string; users: number }[] = [];
  let recentUsers: { userId: string; name: string; email: string; role: string; status: string; provider: string; avatar: string; emailVerified: boolean; createdAt: string; lastLogin?: string; orgName?: string; orgId?: string }[] = [];
  let revenueData: { month: string; revenue: number }[] = [];

  if (isSuperAdmin) {
    metrics = await getAllMetrics();
    newUsersData = await getUsersByState();
    recentUsers = await getRecentUsers();
    revenueData = await getMonthlyRevenue();
  } else {
    metrics = await getOrgMetrics(orgId || "null");
    newUsersData = await getUsersByState(orgId);
    recentUsers = await getRecentUsers(orgId);
    revenueData = await getMonthlyRevenue(orgId);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isSuperAdmin ? "Super Admin Dashboard" : "Organization Dashboard"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin ? "Overview of all organizations" : "Your organization at a glance"}
          </p>
        </div>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-3 lg:grid-cols-6">
        {isSuperAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Organizations</CardTitle>
              <Building2Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics as unknown as { orgCount?: number }).orgCount ?? 0}</div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
            <UsersIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.memberCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            <ClipboardListIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.taskCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle2Icon className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <ClockIcon className="size-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.inProgressTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activities</CardTitle>
            <ActivityIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activityCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {revenueData.length > 0 && <MonthlyRevenueChart data={revenueData} />}
        {newUsersData.length > 0 && <NewUsersChart data={newUsersData} />}
      </div>

      {recentUsers.length > 0 && (
        <DashboardSignupsTable users={recentUsers} isSuperAdmin={isSuperAdmin} />
      )}
    </div>
  );
}
