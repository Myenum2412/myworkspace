import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members" };

interface MemberData {
  id: string;
  userId: string;
  role: string;
  joinedAt?: Date;
  name: string;
  email: string;
  avatar: string;
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

  return members.map((m: Record<string, unknown>) => {
    const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
    return {
      id: String(m._id || m.id || ""),
      userId: String(m.userId || ""),
      role: String(m.role || "member"),
      joinedAt: m.joinedAt as Date | undefined,
      name: (user?.name as string) || "Unknown",
      email: (user?.email as string) || "",
      avatar: (user?.image as string) || "",
    };
  });
});

export default async function MembersPage() {
  const session = await auth();
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;
  const members = await getMembers(orgId || "null");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Members</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Member List</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Avatar>
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "Recently"}
                    </p>
                  </div>
                  <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
