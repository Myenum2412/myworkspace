import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { Folder } from "../lib/db/models/Folder.js";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { recordAuditLog } from "../services/audit.service.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { cacheManager } from "../lib/cache.js";
import { verifyOrgAccess } from "../lib/org-utils.js";

const router = Router();
router.use(authenticate);

async function verifyMembership(userId: string, orgId: string): Promise<void> {
  await verifyOrgAccess(userId, orgId);
}

router.get("/tree", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");
  await verifyMembership(req.user!.userId, orgId);

  const folders = await Folder.find({ orgId, deletedAt: null }).sort({ path: 1 }).select("id name path parentId orgId clientId createdAt updatedAt deletedAt").lean();
  const tree = buildTree(folders, null);
  res.json({ data: tree });
});

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  const parentId = (req.query.parentId as string) || null;
  const clientId = (req.query.clientId as string) || null;
  if (!orgId) throw new AppError(400, "orgId is required");
  await verifyMembership(req.user!.userId, orgId);

  const filter: Record<string, unknown> = { orgId, deletedAt: null };
  if (parentId) filter.parentId = parentId;
  else filter.parentId = null;
  if (clientId) filter.clientId = clientId;

  const folders = await Folder.find(filter).sort({ name: 1 }).select("id name path parentId orgId clientId createdAt updatedAt").lean();
  res.json({ data: folders });
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const folder = await Folder.findOne({ id: req.params.id, deletedAt: null }).select("id name path parentId orgId clientId createdAt updatedAt deletedAt").lean();
  if (!folder) throw new AppError(404, "Folder not found");
  await verifyMembership(req.user!.userId, folder.orgId);
  res.json({ data: folder });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { orgId, parentId, name, clientId } = req.body;
  if (!orgId || !name) throw new AppError(400, "orgId and name are required");
  await verifyMembership(req.user!.userId, orgId);

  const parent = parentId ? await Folder.findOne({ id: parentId, deletedAt: null }).select("path").lean() : null;
  const path = parent ? `${parent.path}/${name}` : `/${name}`;

  const existing = await Folder.findOne({ orgId, path, deletedAt: null }).select("_id").lean();
  if (existing) throw new AppError(409, "A folder with this name already exists at this location");

  const id = uuid();
  await Folder.create({ id, orgId, parentId: parentId || null, name, path, clientId: clientId || null, createdBy: req.user!.userId });

  await recordAuditLog({
    orgId, userId: req.user!.userId, createdBy: req.user!.userId, action: "folder.created",
    entityType: "folder", entityId: id,
    description: `Folder "${name}" created`,
  });

  cacheManager.invalidatePattern(`folders:${orgId}`);

  res.status(201).json({ success: true, folderId: id });
});

router.patch("/:id", async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name) throw new AppError(400, "name is required");

  const folder = await Folder.findOne({ id: req.params.id, deletedAt: null }).select("id name path parentId orgId").lean();
  if (!folder) throw new AppError(404, "Folder not found");
  await verifyMembership(req.user!.userId, folder.orgId);

  const oldPath = folder.path;
  const parent = folder.parentId ? await Folder.findOne({ id: folder.parentId }).select("path").lean() : null;
  const newPath = parent ? `${parent.path}/${name}` : `/${name}`;

  const existing = await Folder.findOne({ orgId: folder.orgId, path: newPath, deletedAt: null, id: { $ne: folder.id } }).select("_id").lean();
  if (existing) throw new AppError(409, "A folder with this name already exists");

  const oldPrefix = oldPath + "/";
  const newPrefix = newPath + "/";
  await Folder.updateOne({ id: folder.id }, { name, path: newPath, updatedBy: req.user!.userId });
  const childFolders = await Folder.find({
    orgId: folder.orgId,
    path: { $regex: `^${escapeRegex(oldPrefix)}` },
  }).select("id path").lean();
  for (const child of childFolders) {
    const childNewPath = child.path.replace(oldPrefix, newPrefix);
    await Folder.updateOne({ id: child.id }, { path: childNewPath });
  }

  await recordAuditLog({
    orgId: folder.orgId, userId: req.user!.userId, createdBy: req.user!.userId, action: "folder.renamed",
    entityType: "folder", entityId: folder.id,
    description: `Folder renamed from "${folder.name}" to "${name}"`,
  });

  cacheManager.invalidatePattern(`folders:${folder.orgId}`);

  res.json({ success: true });
});

router.post("/:id/move", async (req: AuthRequest, res: Response) => {
  const { targetParentId } = req.body;
  const folder = await Folder.findOne({ id: req.params.id, deletedAt: null }).select("id orgId name path parentId").lean();
  if (!folder) throw new AppError(404, "Source folder not found");
  await verifyMembership(req.user!.userId, folder.orgId);

  if (folder.id === targetParentId) throw new AppError(400, "Cannot move folder into itself");

  const targetParent = targetParentId ? await Folder.findOne({ id: targetParentId, deletedAt: null }).select("path").lean() : null;
  if (targetParentId && !targetParent) throw new AppError(404, "Target folder not found");

  const oldPath = folder.path;
  const newPath = targetParent ? `${targetParent.path}/${folder.name}` : `/${folder.name}`;

  const existing = await Folder.findOne({ orgId: folder.orgId, path: newPath, deletedAt: null, id: { $ne: folder.id } }).select("_id").lean();
  if (existing) throw new AppError(409, "A folder with this name already exists at target location");

  await Folder.updateOne({ id: folder.id }, { parentId: targetParentId || null, path: newPath, updatedBy: req.user!.userId });
  const oldPrefix = oldPath + "/";
  const newPrefix = newPath + "/";
  const childFolders = await Folder.find({ orgId: folder.orgId, path: { $regex: `^${escapeRegex(oldPrefix)}` } }).select("id path").lean();
  for (const child of childFolders) {
    const childNewPath = child.path.replace(oldPrefix, newPrefix);
    await Folder.updateOne({ id: child.id }, { path: childNewPath });
  }

  await FileAttachment.updateMany({ orgId: folder.orgId, folderId: folder.id }, { folderId: targetParentId || null });

  cacheManager.invalidatePattern(`folders:${folder.orgId}`);

  res.json({ success: true });
});

router.post("/:id/copy", async (req: AuthRequest, res: Response) => {
  const { targetParentId } = req.body;
  const folder = await Folder.findOne({ id: req.params.id, deletedAt: null }).select("id orgId name path parentId").lean();
  if (!folder) throw new AppError(404, "Folder not found");
  await verifyMembership(req.user!.userId, folder.orgId);

  const targetParent = targetParentId ? await Folder.findOne({ id: targetParentId, deletedAt: null }).select("path").lean() : null;
  if (targetParentId && !targetParent) throw new AppError(404, "Target folder not found");

  const newPath = targetParent ? `${targetParent.path}/${folder.name}` : `/${folder.name}`;
  const existing = await Folder.findOne({ orgId: folder.orgId, path: newPath, deletedAt: null }).select("_id").lean();
  if (existing) throw new AppError(409, "A folder with this name already exists at target location");

  const folderIdMap = new Map<string, string>();
  const sources = await Folder.find({ orgId: folder.orgId, deletedAt: null, $or: [{ id: folder.id }, { path: { $regex: `^${escapeRegex(folder.path)}/` } }] }).sort({ path: 1 }).select("id name path parentId").lean();

  for (const src of sources) {
    const newId = uuid();
    folderIdMap.set(src.id, newId);
    const relPath = src.path.replace(folder.path, "");
    const copyPath = targetParent ? `${targetParent.path}/${folder.name}${relPath}` : `/${folder.name}${relPath}`;
    const newParentId = src.parentId ? folderIdMap.get(src.parentId) || null : targetParentId || null;
    await Folder.create({ id: newId, orgId: folder.orgId, parentId: newParentId, name: src.name, path: copyPath, createdBy: req.user!.userId });
  }

  const files = await FileAttachment.find({ orgId: folder.orgId, folderId: { $in: sources.map(s => s.id) }, deletedAt: null }).select("id folderId name originalName uploaderId createdAt").lean();
  for (const file of files) {
    const newFolderId = file.folderId ? folderIdMap.get(file.folderId) || null : null;
    const copyId = uuid();
    await FileAttachment.create({
      ...file,
      _id: undefined,
      id: copyId,
      folderId: newFolderId,
      name: file.name,
      originalName: file.originalName,
      uploaderId: req.user!.userId,
      createdBy: req.user!.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  res.status(201).json({ success: true, folderId: folderIdMap.get(folder.id) });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const folder = await Folder.findOne({ id: req.params.id, deletedAt: null }).select("id orgId name path").lean();
  if (!folder) throw new AppError(404, "Folder not found");
  await verifyMembership(req.user!.userId, folder.orgId);

  const now = new Date();

  // Collect all descendant folder IDs recursively
  const allChildFolders = await Folder.find({
    orgId: folder.orgId,
    path: { $regex: `^${escapeRegex(folder.path)}/` },
  }).select("id").lean();
  const allFolderIds = [folder.id, ...allChildFolders.map(f => f.id)];

  // Soft-delete all descendant folders
  await Folder.updateMany(
    { id: { $in: allFolderIds } },
    { deletedAt: now, deletedBy: req.user!.userId }
  );

  // Soft-delete all files inside any of these folders
  await FileAttachment.updateMany(
    { orgId: folder.orgId, folderId: { $in: allFolderIds }, deletedAt: null },
    { deletedAt: now, deletedBy: req.user!.userId }
  );

  await recordAuditLog({
    orgId: folder.orgId, userId: req.user!.userId, createdBy: req.user!.userId, action: "folder.deleted",
    entityType: "folder", entityId: folder.id,
    description: `Folder "${folder.name}" and ${allChildFolders.length} sub-folders deleted`,
  });

  cacheManager.invalidatePattern(`folders:${folder.orgId}`);

  res.json({ success: true });
});

function buildTree(folders: any[], parentId: string | null): any[] {
  return folders
    .filter(f => f.parentId === parentId)
    .map(f => ({ ...f, children: buildTree(folders, f.id) }));
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default router;
