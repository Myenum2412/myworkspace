import { type Response, Router } from "express";
import mongoose from "mongoose";
import { Drawing } from "../lib/db/models/Drawing.js";
import { requireOrgMembershipFromRequest } from "../lib/org-utils.js";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "../services/audit.service.js";

const router = Router();
router.use(authenticate);

const MAX_ENTITIES = 250_000;
const MAX_DRAWING_NAME_LENGTH = 255;

function requireValidDrawingId(id: string): void {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, "Invalid drawing id");
}

function asFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sanitizeSummary(summary: unknown): Record<string, unknown> {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return {};
  const s = summary as Record<string, unknown>;
  const layers = Array.isArray(s.layers)
    ? s.layers.slice(0, 1000).filter((l): l is string => typeof l === "string")
    : [];
  return {
    totalEntities: Math.max(0, asFiniteNumber(s.totalEntities)),
    lines: Math.max(0, asFiniteNumber(s.lines)),
    polylines: Math.max(0, asFiniteNumber(s.polylines)),
    circles: Math.max(0, asFiniteNumber(s.circles)),
    otherEntities: Math.max(0, asFiniteNumber(s.otherEntities)),
    layers: [...new Set(layers)].slice(0, 1000),
  };
}

// POST /api/drawings/upload — store a drawing exported by an AutoCAD plugin
router.post("/upload", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);

  const { drawingName, entities, userId, sourceFile, summary, metadata } = req.body as {
    drawingName?: unknown;
    entities?: unknown;
    userId?: unknown;
    sourceFile?: unknown;
    summary?: unknown;
    metadata?: unknown;
  };

  if (typeof drawingName !== "string" || !drawingName.trim()) {
    throw new AppError(400, "drawingName is required");
  }
  if (drawingName.length > MAX_DRAWING_NAME_LENGTH) {
    throw new AppError(400, `drawingName must be ${MAX_DRAWING_NAME_LENGTH} characters or fewer`);
  }
  if (!Array.isArray(entities)) {
    throw new AppError(400, "entities must be an array");
  }
  if (entities.length > MAX_ENTITIES) {
    throw new AppError(413, `entities exceeds the maximum of ${MAX_ENTITIES}`);
  }

  const ownerUserId = typeof userId === "string" && userId.trim() ? userId : req.user!.userId;
  const cleanSourceFile = typeof sourceFile === "string" ? sourceFile.slice(0, 512) : undefined;
  const cleanMetadata =
    metadata && typeof metadata === "object"
      ? {
          pluginVersion:
            typeof (metadata as Record<string, unknown>).pluginVersion === "string"
              ? (metadata as Record<string, unknown>).pluginVersion
              : undefined,
          autocadVersion:
            typeof (metadata as Record<string, unknown>).autocadVersion === "string"
              ? (metadata as Record<string, unknown>).autocadVersion
              : undefined,
        }
      : undefined;

  const drawing = await Drawing.create({
    drawingName: drawingName.trim(),
    userId: ownerUserId,
    orgId,
    sourceFile: cleanSourceFile,
    status: "available",
    summary: sanitizeSummary(summary),
    entities: entities as Array<Record<string, unknown>>,
    metadata: cleanMetadata,
  });

  const data = {
    id: drawing._id.toString(),
    drawingName: drawing.drawingName,
    entityCount: drawing.entities.length,
    summary: drawing.summary,
    createdAt: drawing.createdAt,
  };

  void recordAuditLog({
    orgId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "drawing.uploaded",
    entityType: "drawing",
    entityId: data.id,
    description: `Uploaded drawing "${drawing.drawingName}" with ${data.entityCount} entities`,
    metadata: { source: "autocad-plugin" },
  });

  res.status(201).json({ success: true, data });
});

// GET /api/drawings — list drawings for the authenticated user's org
router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembershipFromRequest(req);
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20),
  );
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { orgId, status: "available" };
  if (userId) filter.userId = userId;

  const [items, total] = await Promise.all([
    Drawing.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("drawingName userId sourceFile summary metadata createdAt")
      .lean(),
    Drawing.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items.map((d: any) => ({
      id: d._id.toString(),
      drawingName: d.drawingName,
      userId: d.userId,
      sourceFile: d.sourceFile,
      summary: d.summary,
      metadata: d.metadata,
      createdAt: d.createdAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// GET /api/drawings/:id — fetch a single drawing with entities
router.get("/:id", async (req: AuthRequest, res: Response) => {
  requireValidDrawingId(req.params.id);
  const orgId = await requireOrgMembershipFromRequest(req);
  const drawing = await Drawing.findOne({ _id: req.params.id, orgId }).select("-__v").lean();

  if (!drawing) throw new AppError(404, "Drawing not found");

  res.json({
    success: true,
    data: {
      id: (drawing as any)._id.toString(),
      drawingName: drawing.drawingName,
      userId: drawing.userId,
      sourceFile: drawing.sourceFile,
      status: drawing.status,
      summary: drawing.summary,
      entities: drawing.entities,
      metadata: drawing.metadata,
      createdAt: drawing.createdAt,
    },
  });
});

// DELETE /api/drawings/:id — archive/remove a drawing
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  requireValidDrawingId(req.params.id);
  const orgId = await requireOrgMembershipFromRequest(req);
  const result = await Drawing.deleteOne({ _id: req.params.id, orgId });

  if (result.deletedCount === 0) throw new AppError(404, "Drawing not found");

  void recordAuditLog({
    orgId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "drawing.deleted",
    entityType: "drawing",
    entityId: req.params.id,
    description: "Deleted drawing",
    metadata: { source: "autocad-plugin" },
  });

  res.json({ success: true });
});

export default router;
