import { Router, Response } from "express";
import { PipelineStage } from "mongoose";
import { Team } from "../lib/db/models/Team.js";
import { TeamMember } from "../lib/db/models/TeamMember.js";
import { User } from "../lib/db/models/User.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireOrgMembership, requireOrgMembershipFromRequest } from "../lib/org-utils.js";

const router = Router();

router.use(authenticate);

// List all teams in the user's org with member counts, pagination, filtering, and sorting
router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);

  // Pagination params
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  // Name search filter
  const nameSearch = (req.query.name as string)?.trim();

  // Sorting params
  const allowedSortFields: Record<string, string> = {
    name: "name",
    createdAt: "createdAt",
    memberCount: "memberCount",
  };
  const sortBy = allowedSortFields[req.query.sortBy as string] || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  // Build match stage for the aggregation
  const teamMatch: Record<string, unknown> = { orgId };
  if (nameSearch) {
    teamMatch.name = { $regex: nameSearch, $options: "i" };
  }

  // Aggregation pipeline: get teams with member counts and lead user info in one query
  const pipeline: PipelineStage[] = [
    { $match: teamMatch },
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
        let: {
          leadIds: {
            $filter: {
              input: "$members",
              as: "m",
              cond: { $eq: ["$$m.role", "lead"] },
            },
          },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$_id", "$$leadIds.userId"],
              },
            },
          },
          { $project: { name: 1, email: 1, image: 1 } },
        ],
        as: "leadUsers",
      },
    },
    {
      $addFields: {
        memberCount: { $size: "$members" },
        leadUser: { $arrayElemAt: ["$leadUsers", 0] },
      },
    },
    { $project: { members: 0, leadUsers: 0 } },
    // Sorting
    { $sort: { [sortBy]: sortOrder } },
    // Pagination
    { $skip: skip },
    { $limit: limit },
  ];

  // Count total matching teams for pagination metadata
  const countPipeline: PipelineStage[] = [
    { $match: teamMatch },
    { $count: "total" },
  ];

  const [teams, countResult] = await Promise.all([
    Team.aggregate(pipeline),
    Team.aggregate(countPipeline),
  ]);

  const total = countResult.length > 0 ? countResult[0].total : 0;
  const totalPages = Math.ceil(total / limit);

  const result = teams.map((t) => ({
    id: t._id.toString(),
    name: t.name,
    description: t.description || "",
    memberCount: t.memberCount || 0,
    leadName: t.leadUser?.name || "",
    leadAvatar: t.leadUser?.image || "",
    createdAt: t.createdAt,
  }));

  res.json({
    success: true,
    data: result,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

// Get single team with full member details using aggregation
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const team = await Team.findById(req.params.id).lean();
  if (!team) throw new AppError(404, "Team not found");

  await requireOrgMembershipFromRequest(req, team.orgId.toString());

  // Aggregation pipeline: get team with all members and their user details in one query
  const pipeline: PipelineStage[] = [
    { $match: { _id: team._id } },
    {
      $lookup: {
        from: "teammembers",
        localField: "_id",
        foreignField: "teamId",
        as: "teamMembers",
      },
    },
    {
      $lookup: {
        from: "users",
        let: {
          memberIds: "$teamMembers.userId",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$_id", "$$memberIds"],
              },
            },
          },
          {
            $project: {
              name: 1,
              email: 1,
              image: 1,
              status: 1,
              department: 1,
              designation: 1,
            },
          },
        ],
        as: "users",
      },
    },
    {
      $addFields: {
        members: {
          $map: {
            input: "$teamMembers",
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
                        input: "$users",
                        as: "u",
                        cond: { $eq: ["$$u._id", "$$tm.userId"] },
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
      $project: {
        teamMembers: 0,
        users: 0,
      },
    },
  ];

  const result = await Team.aggregate(pipeline);
  if (result.length === 0) throw new AppError(404, "Team not found");

  const teamData = result[0];

  const members = (teamData.members as Record<string, unknown>[]).map((m) => ({
    id: (m.id as { toString: () => string }).toString ? (m.id as { toString: () => string }).toString() : m.id,
    userId: (m.userId as { toString: () => string }).toString ? (m.userId as { toString: () => string }).toString() : m.userId,
    name: (m.name as string) || "Unknown",
    email: (m.email as string) || "",
    avatar: (m.image as string) || "",
    status: (m.status as string) || "offline",
    department: (m.department as string) || "",
    designation: (m.designation as string) || "",
    role: m.role as string,
  }));

  res.json({
    success: true,
    data: {
      id: teamData._id.toString(),
      name: teamData.name,
      description: teamData.description || "",
      createdAt: teamData.createdAt,
      members,
    },
  });
});

// Create a team
router.post("/", async (req: AuthRequest, res: Response) => {
  const { name, description, orgId: bodyOrgId } = req.body;
  if (!name) throw new AppError(400, "Team name is required");

  const orgId = bodyOrgId || await requireOrgMembershipFromRequest(req);

  await requireOrgMembershipFromRequest(req, orgId);

  const team = await Team.create({
    orgId,
    name,
    description: description || undefined,
    createdBy: req.user!.userId,
  });

  res.status(201).json({ success: true, data: { id: team._id.toString(), name: team.name } });
});

// Update a team
router.put("/:id", async (req: AuthRequest, res: Response) => {
  const team = await Team.findById(req.params.id).lean();
  if (!team) throw new AppError(404, "Team not found");

  await requireOrgMembershipFromRequest(req, team.orgId.toString());

  const { name, description } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (Object.keys(updates).length > 0) updates.updatedBy = req.user!.userId;

  await Team.findByIdAndUpdate(req.params.id, updates);
  res.json({ success: true });
});

// Delete a team
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const team = await Team.findById(req.params.id).lean();
  if (!team) throw new AppError(404, "Team not found");

  await requireOrgMembershipFromRequest(req, team.orgId.toString());

  await TeamMember.deleteMany({ teamId: team._id });
  await Team.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Add member to team
router.post("/:id/members", async (req: AuthRequest, res: Response) => {
  const team = await Team.findById(req.params.id).lean();
  if (!team) throw new AppError(404, "Team not found");

  await requireOrgMembershipFromRequest(req, team.orgId.toString());

  const { userId, role } = req.body;
  if (!userId) throw new AppError(400, "userId is required");

  // Verify user belongs to same org
  await requireOrgMembership(userId, team.orgId.toString());

  // Check not already in team
  const existing = await TeamMember.findOne({ teamId: team._id, userId }).lean();
  if (existing) throw new AppError(400, "User is already a member of this team");

  const teamMember = await TeamMember.create({
    orgId: team.orgId,
    teamId: team._id,
    userId,
    role: role || "member",
  });

  res.status(201).json({ success: true, data: { id: teamMember._id.toString() } });
});

// Remove member from team
router.delete("/:teamId/members/:userId", async (req: AuthRequest, res: Response) => {
  const team = await Team.findById(req.params.teamId).lean();
  if (!team) throw new AppError(404, "Team not found");

  await requireOrgMembershipFromRequest(req, team.orgId.toString());

  await TeamMember.deleteOne({ teamId: team._id, userId: req.params.userId });
  res.json({ success: true });
});

// Update member role
router.patch("/:teamId/members/:userId/role", async (req: AuthRequest, res: Response) => {
  const team = await Team.findById(req.params.teamId).lean();
  if (!team) throw new AppError(404, "Team not found");

  await requireOrgMembershipFromRequest(req, team.orgId.toString());

  const { role } = req.body;
  if (!role || !["lead", "member"].includes(role)) throw new AppError(400, "Valid role required (lead or member)");

  await TeamMember.updateOne({ teamId: team._id, userId: req.params.userId }, { role });
  res.json({ success: true });
});

export default router;
