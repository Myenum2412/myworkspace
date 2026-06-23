import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";

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
  const cursor = await db.collection(collections.orgMembers).find({ orgId });
  const members = await cursor.sort({ joinedAt: -1 }).toArray();
  const userIds = members.map((m: Record<string, unknown>) => m.userId as string);
  const users = userIds.length > 0
    ? await (await db.collection(collections.users).find({ id: { $in: userIds } }))
        .project({ id: 1, name: 1, email: 1, image: 1, status: 1, createdAt: 1, emailVerified: 1, isActive: 1, lastLogin: 1, provider: 1 })
        .toArray()
    : [];
  const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));
  const org = await db.collection(collections.organizations).findOne({ id: orgId });
  const orgName = (org?.name as string) || "Unknown";

  return members.map((m: Record<string, unknown>) => {
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
    };
  });
});

const getAllMembers = cache(async (): Promise<MemberData[]> => {
  const cursor = await db.collection(collections.orgMembers).find({});
  const members = await cursor.sort({ joinedAt: -1 }).toArray();
  const userIds = [...new Set(members.map((m: Record<string, unknown>) => m.userId as string))];
  const orgIds = [...new Set(members.map((m: Record<string, unknown>) => m.orgId as string))];

  const users = userIds.length > 0
    ? await (await db.collection(collections.users).find({ id: { $in: userIds } }))
        .project({ id: 1, name: 1, email: 1, image: 1, status: 1, createdAt: 1, emailVerified: 1, isActive: 1, lastLogin: 1, provider: 1 })
        .toArray()
    : [];
  const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));

  const orgs = orgIds.length > 0
    ? await (await db.collection(collections.organizations).find({ id: { $in: orgIds } })).project({ id: 1, name: 1 }).toArray()
    : [];
  const orgMap = new Map(orgs.map((o: Record<string, unknown>) => [o.id, o]));

  return members.map((m: Record<string, unknown>) => {
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
    };
  });
});

const providerColors: Record<string, string> = {
  google: "text-[#4285F4]",
  github: "text-[#333] dark:text-[#f0f0f0]",
  linkedin: "text-[#0A66C2]",
  credentials: "text-muted-foreground",
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  online: "default",
  offline: "outline",
  break: "secondary",
};

function fmt(d?: Date): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function MembersPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const members = isSuperAdmin ? await getAllMembers() : await getMembers(orgId || "null");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin ? `${members.length} members across all organizations` : `${members.length} members in your organization`}
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search members..." className="pl-9 h-9" />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Login</TableHead>
              {isSuperAdmin && <TableHead>Organization</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
                <TableRow>
                <TableCell colSpan={isSuperAdmin ? 10 : 9} className="h-32 text-center text-muted-foreground">
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="text-[10px]">{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant={member.role === "admin" ? "default" : member.role === "manager" ? "secondary" : "outline"} className="text-xs">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[member.status] || "outline"} className="text-xs capitalize">
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium capitalize ${providerColors[member.provider] || "text-muted-foreground"}`}>
                      {member.provider}
                    </span>
                  </TableCell>
                  <TableCell>
                    {member.emailVerified ? (
                      <CheckCircle2Icon className="size-4 text-green-500" />
                    ) : (
                      <XCircleIcon className="size-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmt(member.createdAt || member.joinedAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmt(member.lastLogin)}</TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{member.orgName}</Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
