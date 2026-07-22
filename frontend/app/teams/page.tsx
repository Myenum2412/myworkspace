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
  members?: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    avatar: string;
    status: string;
    department: string;
    designation: string;
    role: string;
  }>;
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
          $addFields: {
            _teamIdStr: { $toString: "$_id" },
          },
        },
        {
          $lookup: {
            from: collections.teamMembers,
            let: { teamIdStr: "$_teamIdStr" },
            pipeline: [
              { $match: { $expr: { $eq: ["$teamId", "$$teamIdStr"] } } },
            ],
            as: "members",
          },
        },
        {
          $addFields: {
            leadIds: {
              $filter: {
                input: "$members",
                as: "m",
                cond: { $eq: ["$$m.role", "team_lead"] },
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            let: { leadUserIds: "$leadIds.userId" },
            pipeline: [
              { $match: { $expr: { $in: ["$id", "$$leadUserIds"] } } },
              { $project: { name: 1, email: 1, image: 1 } },
            ],
            as: "leadUsers",
          },
        },
        {
          $lookup: {
            from: "users",
            let: { memberUserIds: "$members.userId" },
            pipeline: [
              { $match: { $expr: { $in: ["$id", "$$memberUserIds"] } } },
              { $project: { name: 1, email: 1, image: 1, status: 1, department: 1, designation: 1 } },
            ],
            as: "memberUsers",
          },
        },
        {
          $addFields: {
            memberCount: { $size: "$members" },
            memberIds: "$members.userId",
            leadUser: { $arrayElemAt: ["$leadUsers", 0] },
            id: "$_id",
            members: {
              $map: {
                input: "$members",
                as: "tm",
                in: {
                  $mergeObjects: [
                    {
                      id: "$$tm._id",
                      userId: "$$tm.userId",
                      role: "$$tm.role",
                    },
                    {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$memberUsers",
                            as: "u",
                            cond: { $eq: ["$$u.id", "$$tm.userId"] },
                          },
                        },
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            leadName: "$leadUser.name",
            leadAvatar: "$leadUser.image",
            leadId: "$leadUser.id",
          },
        },
        {
          $project: {
            _id: 0,
            _teamIdStr: 0,
            leadIds: 0,
            leadUsers: 0,
            memberUsers: 0,
            leadUser: 0,
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
      members: (t.members as Record<string, unknown>[] || []).map((m) => ({
        id: String(m.id || ""),
        userId: String(m.userId || ""),
        name: (m.name as string) || "Unknown",
        email: (m.email as string) || "",
        avatar: (m.image as string) || "",
        status: (m.status as string) || "offline",
        department: (m.department as string) || "",
        designation: (m.designation as string) || "",
        role: (m.role as string) || "team_staff",
      })),
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
          role: (m.role as string) || "staffs",
          designation: u?.designation || (m.designation as string) || "",
          department: u?.department || (m.department as string) || "",
        };
      });
    }
  }

  return <TeamsClient teams={teams} members={members} orgId={orgId} />;
}
