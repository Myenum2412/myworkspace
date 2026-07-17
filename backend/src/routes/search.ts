import { Router, Response } from "express";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { Folder } from "../lib/db/models/Folder.js";
import { Task } from "../lib/db/models/Task.js";
import { Project } from "../lib/db/models/Project.js";
import { Client } from "../lib/db/models/Client.js";
import { Team } from "../lib/db/models/Team.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { User } from "../lib/db/models/User.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();
router.use(authenticate);

const ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;
function escapeRegex(s: string) {
  return s.replace(ESCAPE_RE, "\\$&");
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  const q = req.query.q as string;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  if (!orgId) throw new AppError(400, "orgId is required");
  if (!q) throw new AppError(400, "Search query (q) is required");

  const member = await OrgMember.findOne({ userId: req.user!.userId, orgId }).select("_id").lean();
  if (!member) throw new AppError(403, "Not authorized");

  const escaped = escapeRegex(q);
  const regex = { $regex: escaped, $options: "i" };

  const fileMatch: Record<string, any> = { orgId, deletedAt: null };
  fileMatch.$or = [
    { name: regex },
    { originalName: regex },
    { description: regex },
    { tags: regex },
  ];

  const folderMatch: Record<string, any> = { orgId, deletedAt: null, name: regex };

  const taskMatch: Record<string, any> = { orgId };
  taskMatch.$or = [
    { title: regex },
    { description: regex },
  ];

  const projectMatch: Record<string, any> = { orgId, name: regex };

  const userMatch: Record<string, any> = { orgId };
  userMatch.$or = [
    { name: regex },
    { email: regex },
  ];

  const clientMatch: Record<string, any> = { orgId };
  clientMatch.$or = [
    { name: regex },
    { email: regex },
    { company: regex },
  ];

  const teamMatch: Record<string, any> = { orgId, name: regex };

  const [
    files,
    folders,
    tasks,
    projects,
    employees,
    clients,
    teams,
  ] = await Promise.all([
    FileAttachment.find(fileMatch).sort({ createdAt: -1 }).limit(limit).select("id orgId name originalName mimeType size uploaderId createdAt").lean(),
    Folder.find(folderMatch).limit(limit).select("id name path parentId").lean(),
    Task.find(taskMatch).sort({ createdAt: -1 }).limit(limit).select("id orgId title description status priority createdAt").lean(),
    Project.find(projectMatch).sort({ createdAt: -1 }).limit(limit).select("id name description status").lean(),
    User.find(userMatch).sort({ createdAt: -1 }).limit(limit).select("id name email role").lean(),
    Client.find(clientMatch).sort({ createdAt: -1 }).limit(limit).select("id name email company").lean(),
    Team.find(teamMatch).sort({ createdAt: -1 }).limit(limit).select("id name description").lean(),
  ]);

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const uploaders = await User.find({ _id: { $in: userIds } }).select("_id name").lean();
  const userMap = new Map(uploaders.map(u => [u._id.toString(), u.name]));

  const total =
    files.length + folders.length + tasks.length + projects.length +
    employees.length + clients.length + teams.length;

  res.json({
    success: true,
    data: {
      files: files.map(f => ({ ...f, uploaderName: userMap.get(f.uploaderId) || "Unknown" })),
      folders: folders.map(f => ({ id: f._id.toString(), name: f.name, path: f.path, parentId: f.parentId })),
      tasks: tasks.map(t => ({ id: t._id.toString(), title: t.title, description: t.description, status: t.status, priority: t.priority })),
      projects: projects.map(p => ({ id: p.id || p._id.toString(), name: p.name, description: p.description, status: p.status })),
      employees: employees.map(e => ({ id: e.id || e._id.toString(), name: e.name, email: e.email, role: e.role })),
      clients: clients.map(c => ({ id: c.id || c._id.toString(), name: c.name, email: c.email, company: c.company })),
      teams: teams.map(t => ({ id: t._id.toString(), name: t.name, description: t.description })),
    },
    meta: {
      total,
      query: q,
    },
  });
});

export default router;
