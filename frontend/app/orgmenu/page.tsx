import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewUsersChart } from "@/components/NewUsersChart";
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

const getNewUsersByMonth = cache(async (orgId?: string | null) => {
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
        { $match: { "user.createdAt": { $exists: true } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$user.createdAt" } },
            users: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]
    : [
        { $match: { createdAt: { $exists: true } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            users: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ];
  const cursor = await db
    .collection(orgId ? collections.orgMembers : collections.users)
    .aggregate(pipeline);
  const raw = await cursor.toArray();
  return raw.map((r) => ({
    month: r._id as string,
    users: r.users as number,
  }));
});

const getRecentUsers = cache(async (orgId?: string | null) => {
  const cursor = await db.collection(
    orgId ? collections.orgMembers : collections.users,
  ).find(
    orgId ? { orgId } : {},
    { sort: { createdAt: -1 }, limit: 10, projection: orgId ? { userId: 1, joinedAt: 1 } : { id: 1, name: 1, email: 1, role: 1, status: 1, createdAt: 1 } },
  );
  const raw = await cursor.toArray();

  if (orgId) {
    const userIds = raw.map((r: Record<string, unknown>) => r.userId as string);
    const users = await (await db.collection(collections.users).find(
      { id: { $in: userIds } },
      { projection: { id: 1, name: 1, email: 1, role: 1, status: 1, createdAt: 1 } },
    )).toArray();
    const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));
    return raw.map((r: Record<string, unknown>) => {
      const u = userMap.get(r.userId as string) as Record<string, unknown> | undefined;
      return { name: u?.name as string || "Unknown", email: u?.email as string || "", role: u?.role as string || "", status: u?.status as string || "offline", createdAt: r.joinedAt as string || u?.createdAt as string };
    });
  }

  return raw.map((r: Record<string, unknown>) => ({
    name: r.name as string,
    email: r.email as string,
    role: r.role as string,
    status: r.status as string || "offline",
    createdAt: r.createdAt as string,
  }));
});

const getRecentOrgs = cache(async () => {
  const cursor = await db.collection(collections.organizations).find(
    {},
    { sort: { createdAt: -1 }, limit: 5, projection: { id: 1, name: 1, plan: 1, createdAt: 1 } },
  );
  const orgs = await cursor.toArray();
  return orgs;
});

export default async function OrgDashboardPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";

  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let metrics: Awaited<ReturnType<typeof getOrgMetrics>>;
  let recentOrgs: Awaited<ReturnType<typeof getRecentOrgs>> = [];
  let newUsersData: { month: string; users: number }[] = [];
  let recentUsers: { name: string; email: string; role: string; status: string; createdAt: string }[] = [];

  if (isSuperAdmin) {
    metrics = await getAllMetrics();
    recentOrgs = await getRecentOrgs();
    newUsersData = await getNewUsersByMonth();
    recentUsers = await getRecentUsers();
  } else {
    metrics = await getOrgMetrics(orgId || "null");
    newUsersData = await getNewUsersByMonth(orgId);
    recentUsers = await getRecentUsers(orgId);
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
            <CheckCircle2Icon className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <ClockIcon className="size-4 text-amber-500" />
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
        {isSuperAdmin && recentOrgs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2Icon className="size-5" />
                Recent Organizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrgs.map((org) => (
                    <TableRow key={org.id as string}>
                      <TableCell className="font-medium">{org.name as string}</TableCell>
                      <TableCell>{(org.plan as string) || "starter"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {org.createdAt ? new Date(org.createdAt as string).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {newUsersData.length > 0 && <NewUsersChart data={newUsersData} />}
      </div>

      {recentUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlusIcon className="size-5" />
              Recent Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Signed Up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>
                      <Badge className={u.status === "online" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}>
                        {u.status === "online" ? "Online" : "Offline"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="min-h-[200px] flex-1 rounded-xl bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <Building2Icon className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin ? "Organization overview across all tenants" : "Organization overview and quick stats"}
          </p>
        </div>
      </div>
    </div>
  );
}
