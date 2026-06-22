import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

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
}

const getMembers = cache(async (orgId: string): Promise<MemberData[]> => {
  const cursor = await db.collection(collections.orgMembers).find({ orgId });
  const members = await cursor.sort({ joinedAt: -1 }).toArray();
  const userIds = members.map((m: Record<string, unknown>) => m.userId as string);
  const users = userIds.length > 0
    ? await (await db.collection(collections.users).find({ id: { $in: userIds } }))
        .project({ id: 1, name: 1, email: 1, image: 1 })
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
        .project({ id: 1, name: 1, email: 1, image: 1 })
        .toArray()
    : [];
  const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));

  const orgs = orgIds.length > 0
    ? await db.collection(collections.organizations).find({ id: { $in: orgIds } }).project({ id: 1, name: 1 }).toArray()
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
    };
  });
});

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

      <Card>
        <CardHeader>
          <CardTitle>Member List ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <Avatar>
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  {isSuperAdmin && (
                    <Badge variant="outline" className="shrink-0 text-xs">{member.orgName}</Badge>
                  )}
                  <Badge variant={member.role === "admin" ? "default" : member.role === "manager" ? "secondary" : "outline"} className="shrink-0">
                    {member.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground shrink-0 hidden md:block">
                    {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "Recent"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
