import { Router, Response } from "express";
import { Team } from "../lib/db/models/Team.js";
import { TeamMember } from "../lib/db/models/TeamMember.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { User } from "../lib/db/models/User.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

router.use(authenticate);

async function getUserOrgId(userId: string): Promise<string> {
  const member = await OrgMember.findOne({ userId }).lean();
  if (!member) throw new AppError(403, "User is not a member of any organization");
  return member.orgId.toString();
}

// List all teams in the user's org with member counts
router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || await getUserOrgId(req.user!.userId);

  const teams = await Team.find({ orgId }).sort({ createdAt: -1 }).lean();

  const teamIds = teams.map((t) => t._id);
  const members = await TeamMember.find({ teamId: { $in: teamIds } }).lean();

  const memberCountMap = new Map<string, number>();
  members.forEach((m) => {
    const key = m.teamId.toString();
    memberCountMap.set(key, (memberCountMap.get(key) || 0) + 1);
  });

  // Get leads for each team
  const leadMembers = members.filter((m) => m.role === "lead");
  const leadUserIds = leadMembers.map((m) => m.userId);
  const leadUsers = await User.find({ _id: { $in: leadUserIds } }).select("name email image").lean();
  const leadUserMap = new Map(leadUsers.map((u) => [u._id.toString(), u]));

  const result = teams.map((t) => {
    const teamLead = leadMembers.find((m) => m.teamId.toString() === t._id.toString());
    const leadUser = teamLead ? leadUserMap.get(teamLead.userId.toString()) : null;
    return {
      id: t._id.toString(),
      name: t.name,
      description: t.description || "",
      memberCount: memberCountMap.get(t._id.toString()) || 0,
      leadName: leadUser?.name || "",
      leadAvatar: leadUser?.image || "",
      createdAt: t.createdAt,
    };
  });

  res.json({ success: true, data: result });
});

// Get single team with full member details
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const team = await Team.findById(req.params.id).lean();
  if (!team) throw new AppError(404, "Team not found");

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: team.orgId }).lean();
  if (!membership) throw new AppError(403, "Not authorized");

  const teamMembers = await TeamMember.find({ teamId: team._id }).lean();
  const userIds = teamMembers.map((m) => m.userId);
  const users = await User.find({ _id: { $in: userIds } }).select("name email image status department designation").lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const members = teamMembers.map((m) => {
    const u = userMap.get(m.userId.toString()) as Record<string, unknown> || {};
    return {
      id: m._id.toString(),
      userId: m.userId.toString(),
      name: (u.name as string) || "Unknown",
      email: (u.email as string) || "",
      avatar: (u.image as string) || "",
      status: (u.status as string) || "offline",
      department: (u.department as string) || "",
      designation: (u.designation as string) || "",
      role: m.role,
    };
  });

  res.json({
    success: true,
    data: {
      id: team._id.toString(),
      name: team.name,
      description: team.description || "",
      createdAt: team.createdAt,
      members,
    },
  });
});

// Create a team
router.post("/", async (req: AuthRequest, res: Response) => {
  const { name, description, orgId: bodyOrgId } = req.body;
  if (!name) throw new AppError(400, "Team name is required");

  const orgId = bodyOrgId || await getUserOrgId(req.user!.userId);

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId }).lean();
  if (!membership) throw new AppError(403, "Not authorized");

  const team = await Team.create({
    orgId,
    name,
    description: description || undefined,
  });

  res.status(201).json({ success: true, data: { id: team._id.toString(), name: team.name } });
});

// Update a team
router.put("/:id", async (req: AuthRequest, res: Response) => {
  const team = await Team.findById(req.params.id).lean();
  if (!team) throw new AppError(404, "Team not found");

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: team.orgId }).lean();
  if (!membership) throw new AppError(403, "Not authorized");

  const { name, description } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;

  await Team.findByIdAndUpdate(req.params.id, updates);
  res.json({ success: true });
});

// Delete a team
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const team = await Team.findById(req.params.id).lean();
  if (!team) throw new AppError(404, "Team not found");

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: team.orgId }).lean();
  if (!membership) throw new AppError(403, "Not authorized");

  await TeamMember.deleteMany({ teamId: team._id });
  await Team.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Add member to team
router.post("/:id/members", async (req: AuthRequest, res: Response) => {
  const team = await Team.findById(req.params.id).lean();
  if (!team) throw new AppError(404, "Team not found");

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: team.orgId }).lean();
  if (!membership) throw new AppError(403, "Not authorized");

  const { userId, role } = req.body;
  if (!userId) throw new AppError(400, "userId is required");

  // Verify user belongs to same org
  const userOrgMembership = await OrgMember.findOne({ userId, orgId: team.orgId }).lean();
  if (!userOrgMembership) throw new AppError(400, "User is not a member of this organization");

  // Check not already in team
  const existing = await TeamMember.findOne({ teamId: team._id, userId }).lean();
  if (existing) throw new AppError(400, "User is already a member of this team");

  const teamMember = await TeamMember.create({
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

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: team.orgId }).lean();
  if (!membership) throw new AppError(403, "Not authorized");

  await TeamMember.deleteOne({ teamId: team._id, userId: req.params.userId });
  res.json({ success: true });
});

// Update member role
router.patch("/:teamId/members/:userId/role", async (req: AuthRequest, res: Response) => {
  const team = await Team.findById(req.params.teamId).lean();
  if (!team) throw new AppError(404, "Team not found");

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: team.orgId }).lean();
  if (!membership) throw new AppError(403, "Not authorized");

  const { role } = req.body;
  if (!role || !["lead", "member"].includes(role)) throw new AppError(400, "Valid role required (lead or member)");

  await TeamMember.updateOne({ teamId: team._id, userId: req.params.userId }, { role });
  res.json({ success: true });
});

export default router;
