import { Router, Response } from "express";
import { User } from "../lib/db/models/User.js";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { authenticate } from "../middleware/auth.js";
import { orgMenuAdminOnly, authorizePermission, auditLog } from "../middleware/authorize.js";
import { AuthRequest } from "../types/index.js";
import { AppError } from "../middleware/error.js";

const router = Router();

router.use(authenticate);
router.use(orgMenuAdminOnly());

router.get("/stats", async (_req: AuthRequest, res: Response) => {
  const [userCount, orgCount, orgMemberCount, taskCount, logCount] = await Promise.all([
    User.countDocuments(),
    Organization.countDocuments(),
    OrgMember.countDocuments(),
    // Task count
    (await import("../lib/db/models/Task.js")).Task.countDocuments(),
    ActivityLog.countDocuments(),
  ]);

  res.json({
    success: true,
    data: {
      users: userCount,
      organizations: orgCount,
      orgMembers: orgMemberCount,
      tasks: taskCount,
      activityLogs: logCount,
    },
  });
});

router.get("/users", authorizePermission("MANAGE_USERS"), async (_req: AuthRequest, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  const data = users.map((u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    permissions: u.permissions,
    isActive: u.isActive,
    status: u.status,
    lastLogin: u.lastLogin,
    createdAt: u.createdAt,
  }));
  res.json({ success: true, data });
});

router.get("/users/:id", authorizePermission("MANAGE_USERS"), async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw new AppError(404, "User not found");
  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      status: user.status,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    },
  });
});

router.patch("/users/:id/toggle-status", authorizePermission("MANAGE_USERS"), auditLog("user.status.toggle", "user"), async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError(404, "User not found");
  if (user.role === "ORG_MENU_ADMIN") throw new AppError(403, "Cannot deactivate another admin");
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, data: { isActive: user.isActive } });
});

router.get("/organizations", authorizePermission("MANAGE_WORKSPACES"), async (_req: AuthRequest, res: Response) => {
  const organizations = await Organization.find().sort({ createdAt: -1 }).lean();
  const data = await Promise.all(
    organizations.map(async (org) => {
      const memberCount = await OrgMember.countDocuments({ orgId: org._id });
      return { id: org._id, name: org.name, slug: org.slug, plan: org.plan, memberCount, createdAt: org.createdAt };
    })
  );
  res.json({ success: true, data });
});

router.get("/logs", authorizePermission("VIEW_SYSTEM_LOGS"), async (req: AuthRequest, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ success: true, data: logs });
});

router.get("/permissions", async (_req: AuthRequest, res: Response) => {
  const allPermissions = [
    "VIEW_ORGMENU",
    "MANAGE_USERS",
    "MANAGE_WORKSPACES",
    "MANAGE_COMPANIES",
    "MANAGE_BILLING",
    "VIEW_SYSTEM_LOGS",
    "MANAGE_ROLES",
    "MANAGE_SETTINGS",
    "MANAGE_SUBSCRIPTIONS",
  ];
  res.json({ success: true, data: allPermissions });
});

export default router;
