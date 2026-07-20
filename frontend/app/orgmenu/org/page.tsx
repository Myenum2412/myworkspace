import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { MembersTable } from "@/components/members-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organization" };

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

const getWorkspaceMembers = cache(async (orgId: string): Promise<MemberData[]> => {
  const org = await db.collection(collections.organizations).findOne({ id: orgId });
  const orgName = (org?.name as string) || "Unknown";

  const cursor = await db.collection(collections.orgMembers).find({ orgId });
  const members = await cursor.sort({ joinedAt: -1 }).toArray();

  const userIds = members.map((m: Record<string, unknown>) => m.userId as string);

  const users = userIds.length > 0
    ? await (await db.collection(collections.users).find({ id: { $in: userIds } }))
        .project({ id: 1, name: 1, email: 1, image: 1, status: 1, createdAt: 1, emailVerified: 1, isActive: 1, lastLogin: 1, provider: 1, role: 1 })
        .toArray()
    : [];
  const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));

  const workspaceMembers = members.filter((m: Record<string, unknown>) => {
    const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
    if (!user) return false;
    const userRole = (user.role as string) || "";
    return userRole !== "org_admin";
  });

  return workspaceMembers.map((m: Record<string, unknown>) => {
    const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
    return {
      id: String(m._id || m.id || ""),
      userId: String(m.userId || ""),
      role: String(m.role || "staffs"),
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
    };
  });
});

const getAllWorkspaceMembers = cache(async (): Promise<MemberData[]> => {
  const cursor = await db.collection(collections.orgMembers).find({});
  const members = await cursor.sort({ joinedAt: -1 }).toArray();

  const userIds = [...new Set(members.map((m: Record<string, unknown>) => m.userId as string))];
  const orgIds = [...new Set(members.map((m: Record<string, unknown>) => m.orgId as string))];

  const users = userIds.length > 0
    ? await (await db.collection(collections.users).find({ id: { $in: userIds } }))
        .project({ id: 1, name: 1, email: 1, image: 1, status: 1, createdAt: 1, emailVerified: 1, isActive: 1, lastLogin: 1, provider: 1, role: 1 })
        .toArray()
    : [];
  const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));

  const orgs = orgIds.length > 0
    ? await (await db.collection(collections.organizations).find({ id: { $in: orgIds } }, { projection: { id: 1, name: 1 } })).toArray()
    : [];
  const orgMap = new Map(orgs.map((o: Record<string, unknown>) => [o.id, o]));

  const workspaceMembers = members.filter((m: Record<string, unknown>) => {
    const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
    if (!user) return false;
    const userRole = (user.role as string) || "";
    return userRole !== "org_admin";
  });

  return workspaceMembers.map((m: Record<string, unknown>) => {
    const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
    const org = orgMap.get(m.orgId as string) as Record<string, unknown> | undefined;
    return {
      id: String(m._id || m.id || ""),
      userId: String(m.userId || ""),
      role: String(m.role || "staffs"),
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
    };
  });
});

const getClientMembers = cache(async (orgId: string): Promise<MemberData[]> => {
  const org = await db.collection(collections.organizations).findOne({ id: orgId });
  const orgName = (org?.name as string) || "Unknown";

  const clients = await db.collection(collections.clientUsers).find({ orgId }).sort({ createdAt: -1 }).toArray();

  return clients.map((c: Record<string, unknown>) => ({
    id: String(c._id || c.id || ""),
    userId: String(c.id || c._id || ""),
    role: "clients",
    orgId,
    name: (c.name as string) || "Unknown",
    email: (c.email as string) || "",
    avatar: "",
    orgName,
    status: c.isActive ? "active" : "inactive",
    provider: "credentials",
    emailVerified: false,
    isActive: c.isActive !== false,
    createdAt: c.createdAt as Date | undefined,
    lastLogin: undefined,
  }));
});

const getAllClientMembers = cache(async (): Promise<MemberData[]> => {
  const orgs = await db.collection(collections.organizations).find({}, { projection: { id: 1, name: 1 } }).toArray();
  const orgMap = new Map(orgs.map((o: Record<string, unknown>) => [o.id, o]));
  const orgIds = [...orgMap.keys()];

  const clients = orgIds.length > 0
    ? await db.collection(collections.clientUsers).find({ orgId: { $in: orgIds } }).sort({ createdAt: -1 }).toArray()
    : [];

  return clients.map((c: Record<string, unknown>) => {
    const orgId = c.orgId as string;
    const org = orgMap.get(orgId);
    return {
      id: String(c._id || c.id || ""),
      userId: String(c.id || c._id || ""),
      role: "clients",
      orgId,
      name: (c.name as string) || "Unknown",
      email: (c.email as string) || "",
      avatar: "",
      orgName: org?.name as string || "Unknown",
      status: c.isActive ? "active" : "inactive",
      provider: "credentials",
      emailVerified: false,
      isActive: c.isActive !== false,
      createdAt: c.createdAt as Date | undefined,
      lastLogin: undefined,
    };
  });
});

export default async function OrgDetailsPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isClient = role === "clients";
  const isSuperAdmin = role === "org_admin";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let members: MemberData[];
  let title: string;

  if (isClient) {
    members = await (isSuperAdmin ? getAllClientMembers() : getClientMembers(orgId || "null"));
    title = "Client Users";
  } else {
    members = await (isSuperAdmin ? getAllWorkspaceMembers() : getWorkspaceMembers(orgId || "null"));
    title = "Staff Users";
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin ? `${members.length} ${title.toLowerCase()} across all organizations` : `${members.length} ${title.toLowerCase()} in your organization`}
          </p>
        </div>
      </div>

      <MembersTable members={members} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
