import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { MembersTable } from "@/components/members-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members" };

interface MemberData {
  id: string;
  userId: string;
  role: string;
  orgId: string;
  joinedAt?: Date;
  name: string;
  email: string;
  avatar: string;
  orgName: string;
  status: string;
  provider: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt?: Date;
  lastLogin?: Date;
}

const getMembers = cache(async (orgId: string): Promise<MemberData[]> => {
  const org = await db.collection(collections.organizations).findOne({ id: orgId });
  const orgName = (org?.name as string) || "Unknown";

  const cursor = await db.collection(collections.orgMembers).find({ orgId });
  const members = await cursor.sort({ joinedAt: -1 }).toArray();

  const userIds = members.map((m: Record<string, unknown>) => m.userId as string);

  // Fetch users and exclude client panel users and ORG_MENU_ADMIN (origin) users
  const users = userIds.length > 0
    ? await (await db.collection(collections.users).find({ id: { $in: userIds } }))
        .project({ id: 1, name: 1, email: 1, image: 1, status: 1, createdAt: 1, emailVerified: 1, isActive: 1, lastLogin: 1, provider: 1, phone: 1, location: 1, department: 1, designation: 1, role: 1 })
        .toArray()
    : [];
  const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));

  // Filter out ORG_MENU_ADMIN users (origin context, not workspace users)
  const workspaceMembers = members.filter((m: Record<string, unknown>) => {
    const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
    if (!user) return false;
    const userRole = (user.role as string) || "";
    // Exclude ORG_MENU_ADMIN (origin users) and client role users
    return userRole !== "ORG_MENU_ADMIN" && userRole !== "client";
  });

  return workspaceMembers.map((m: Record<string, unknown>) => {
    const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
    return {
      id: String(m._id || m.id || ""),
      userId: String(m.userId || ""),
      role: String(m.role || "member"),
      orgId,
      joinedAt: m.joinedAt as Date | undefined,
      name: (user?.name as string) || "Unknown",
      email: (user?.email as string) || "",
      avatar: (user?.image as string) || "",
      orgName,
      status: (user?.status as string) || "offline",
      provider: (user?.provider as string) || "credentials",
      emailVerified: Boolean(user?.emailVerified),
      isActive: user?.isActive !== false,
      createdAt: user?.createdAt as Date | undefined,
      lastLogin: user?.lastLogin as Date | undefined,
      phone: (user?.phone as string) || undefined,
      location: (user?.location as string) || undefined,
      department: (user?.department as string) || undefined,
      designation: (user?.designation as string) || undefined,
    };
  });
});

const getAllMembers = cache(async (): Promise<MemberData[]> => {
  const cursor = await db.collection(collections.orgMembers).find({});
  const members = await cursor.sort({ joinedAt: -1 }).toArray();

  const userIds = [...new Set(members.map((m: Record<string, unknown>) => m.userId as string))];
  const orgIds = [...new Set(members.map((m: Record<string, unknown>) => m.orgId as string))];

  // Fetch users and exclude client panel users and ORG_MENU_ADMIN (origin) users
  const users = userIds.length > 0
    ? await (await db.collection(collections.users).find({ id: { $in: userIds } }))
        .project({ id: 1, name: 1, email: 1, image: 1, status: 1, createdAt: 1, emailVerified: 1, isActive: 1, lastLogin: 1, provider: 1, phone: 1, location: 1, department: 1, designation: 1, role: 1 })
        .toArray()
    : [];
  const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));

  const orgs = orgIds.length > 0
    ? await (await db.collection(collections.organizations).find({ id: { $in: orgIds } }, { projection: { id: 1, name: 1 } })).toArray()
    : [];
  const orgMap = new Map(orgs.map((o: Record<string, unknown>) => [o.id, o]));

  // Filter out ORG_MENU_ADMIN users (origin context) and client role users
  const workspaceMembers = members.filter((m: Record<string, unknown>) => {
    const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
    if (!user) return false;
    const userRole = (user.role as string) || "";
    return userRole !== "ORG_MENU_ADMIN" && userRole !== "client";
  });

  return workspaceMembers.map((m: Record<string, unknown>) => {
    const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
    const org = orgMap.get(m.orgId as string) as Record<string, unknown> | undefined;
    return {
      id: String(m._id || m.id || ""),
      userId: String(m.userId || ""),
      role: String(m.role || "member"),
      orgId: String(m.orgId || ""),
      joinedAt: m.joinedAt as Date | undefined,
      name: (user?.name as string) || "Unknown",
      email: (user?.email as string) || "",
      avatar: (user?.image as string) || "",
      orgName: (org?.name as string) || "Unknown",
      status: (user?.status as string) || "offline",
      provider: (user?.provider as string) || "credentials",
      emailVerified: Boolean(user?.emailVerified),
      isActive: user?.isActive !== false,
      createdAt: user?.createdAt as Date | undefined,
      lastLogin: user?.lastLogin as Date | undefined,
      phone: (user?.phone as string) || undefined,
      location: (user?.location as string) || undefined,
      department: (user?.department as string) || undefined,
      designation: (user?.designation as string) || undefined,
    };
  });
});

export default async function MembersPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const members = await (isSuperAdmin ? getAllMembers() : getMembers(orgId || "null"));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin ? `${members.length} registered members across all organizations` : `${members.length} registered members in your organization`}
          </p>
        </div>
      </div>

      <MembersTable members={members} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
