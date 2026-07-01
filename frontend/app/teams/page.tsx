import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import TeamsClient from "./teams-client";

export const dynamic = "force-dynamic";

type OrgMember = {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  designation?: string;
  department?: string;
};

type Team = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  leadName: string;
  leadAvatar: string;
  leadId?: string;
  memberIds?: string[];
  createdAt: string;
};

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = (await getUserOrgId(session.user.id, session.user.email)) ?? undefined;

  let teams: Team[] = [];
  let members: OrgMember[] = [];

  if (orgId) {
    const [teamDocs, memberDocs] = await Promise.all([
      db.collection(collections.teams).aggregate([
        { $match: { orgId } },
        {
          $lookup: {
            from: "teammembers",
            localField: "_id",
            foreignField: "teamId",
            as: "members",
          },
        },
        {
          $lookup: {
            from: "users",
            let: { memberUserIds: "$members.userId" },
            pipeline: [
              { $match: { $expr: { $and: [{ $in: ["$id", "$$memberUserIds"] }, { $eq: ["$role", "lead"] }] } } },
              { $project: { name: 1, email: 1, image: 1 } },
            ],
            as: "leadUsers",
          },
        },
        {
          $addFields: {
            memberCount: { $size: "$members" },
            leadUser: { $arrayElemAt: ["$leadUsers", 0] },
            id: "$_id",
          },
        },
        {
          $project: {
            _id: 0,
            id: 1,
            name: 1,
            description: 1,
            memberCount: 1,
            leadName: "$leadUser.name",
            leadAvatar: "$leadUser.image",
            leadId: "$leadUser._id",
            createdAt: 1,
          },
        },
        { $sort: { createdAt: -1 } },
      ]).toArray(),
      (async () => {
        const [fromNextAuth, fromMongoose] = await Promise.all([
          db.collection(collections.orgMembers).find({ orgId }).toArray(),
          db.collection("orgmembers").find({ orgId }).toArray(),
        ]);
        return [...fromNextAuth, ...fromMongoose];
      })(),
    ]);

    teams = (teamDocs as unknown as Record<string, unknown>[]).map((t) => ({
      id: String(t.id || t._id || ""),
      name: (t.name as string) || "",
      description: (t.description as string) || "",
      memberCount: (t.memberCount as number) || 0,
      leadName: (t.leadName as string) || "",
      leadAvatar: (t.leadAvatar as string) || "",
      leadId: t.leadId ? String(t.leadId) : undefined,
      createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
    }));

    const memberIds = (memberDocs as unknown as Record<string, unknown>[]).map((m) => m.userId as string).filter(Boolean);
    if (memberIds.length > 0) {
      const userDocs = await db.collection(collections.users).find({ id: { $in: memberIds } }).toArray();
      const userMap = new Map(
        (userDocs as unknown as Record<string, unknown>[]).map((u) => [
          u.id as string,
          {
            name: (u.name as string) || "",
            email: (u.email as string) || "",
            avatar: (u.image as string) || "",
            status: (u.status as string) || "",
            department: (u.department as string) || "",
            designation: (u.designation as string) || "",
          },
        ])
      );
      members = (memberDocs as unknown as Record<string, unknown>[]).map((m) => {
        const userId = m.userId as string;
        const u = userMap.get(userId);
        return {
          userId,
          name: u?.name || (m.name as string) || "",
          email: u?.email || (m.email as string) || "",
          avatar: u?.avatar || "",
          role: (m.role as string) || "member",
          designation: u?.designation || (m.designation as string) || "",
          department: u?.department || (m.department as string) || "",
        };
      });
    }
  }

  return <TeamsClient teams={teams} members={members} orgId={orgId} />;
}
