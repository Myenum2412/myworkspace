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
import { logger } from "../lib/logger/index.js";
import { cacheManager } from "../lib/cache.js";
import { metricsRegistry } from "../lib/monitoring/index.js";

const router = Router();
router.use(authenticate);

const MAX_QUERY_LENGTH = 200;
const SEARCH_CACHE_TTL = 30000;

function sanitizeQuery(q: string): string {
  return q.replace(/[<>{}]/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFuzzyRegex(query: string): RegExp {
  const escaped = escapeRegex(query);
  const fuzzy = escaped.split(/\s+/).map(term =>
    term.length > 3
      ? term.split("").join(".{0,2}")
      : term,
  ).join(".*");
  return new RegExp(fuzzy, "i");
}

function buildAutocompleteRegex(query: string): RegExp {
  return new RegExp("^" + escapeRegex(query), "i");
}

interface FacetFilters {
  status?: string;
  priority?: string;
  mimeType?: string;
  startDate?: string;
  endDate?: string;
  uploadedBy?: string;
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  const raw = (req.query.q as string || "").trim().slice(0, MAX_QUERY_LENGTH);
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const type = req.query.type as string | undefined;
  const offset = parseInt(req.query.offset as string) || 0;

  const facetStatus = req.query.status as string | undefined;
  const facetPriority = req.query.priority as string | undefined;
  const facetMimeType = req.query.mimeType as string | undefined;
  const facetStartDate = req.query.startDate as string | undefined;
  const facetEndDate = req.query.endDate as string | undefined;
  const facetUploadedBy = req.query.uploadedBy as string | undefined;

  const facets: FacetFilters = {
    status: facetStatus,
    priority: facetPriority,
    mimeType: facetMimeType,
    startDate: facetStartDate,
    endDate: facetEndDate,
    uploadedBy: facetUploadedBy,
  };

  if (!orgId) throw new AppError(400, "orgId is required");
  if (!raw) throw new AppError(400, "Search query (q) is required");

  const member = await OrgMember.findOne({ userId: req.user!.userId, orgId }).select("_id").lean();
  if (!member) throw new AppError(403, "Not authorized");

  const cacheKey = `search:${orgId}:${raw}:${type || "all"}:${offset}:${limit}:${JSON.stringify(facets)}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    metricsRegistry.incrementCounter("search_cache_hits", { orgId });
    res.json(cached);
    return;
  }
  metricsRegistry.incrementCounter("search_cache_misses", { orgId });

  const startTime = Date.now();
  const allTypes = !type || type === "all";

  const searchText = { $text: { $search: raw } };
  const textSort = { score: { $meta: "textScore" } };
  const fuzzyRegex = buildFuzzyRegex(raw);

  function buildDateFilter(): Record<string, unknown> | undefined {
    if (!facetStartDate && !facetEndDate) return undefined;
    const dateFilter: Record<string, unknown> = {};
    if (facetStartDate) dateFilter.$gte = new Date(facetStartDate);
    if (facetEndDate) dateFilter.$lte = new Date(facetEndDate);
    return dateFilter;
  }

  async function searchWithFallback(
    model: any,
    match: Record<string, any>,
    select: string,
    entityType: string,
    weight: number,
  ): Promise<{ results: any[]; hasMore: boolean }> {
    if (!allTypes && type !== entityType) return { results: [], hasMore: false };

    const dateFilter = buildDateFilter();
    const fullMatch: Record<string, any> = { ...match, ...searchText };
    if (dateFilter) fullMatch.createdAt = dateFilter;
    if (facets.status) fullMatch.status = facets.status;
    if (facets.priority) fullMatch.priority = facets.priority;
    if (facets.mimeType) fullMatch.mimeType = { $regex: `^${escapeRegex(facetMimeType!)}`, $options: "i" };
    if (facets.uploadedBy) fullMatch.uploaderId = facets.uploadedBy;

    try {
      const results = await model.find(fullMatch)
        .sort(textSort)
        .skip(offset)
        .limit(limit + 1)
        .select(select)
        .lean();
      const hasMore = results.length > limit;
      return { results: results.slice(0, limit).map((r: any) => ({ ...r, _searchType: entityType, _weight: weight })), hasMore };
    } catch {
      const regexMatch: Record<string, unknown> = { ...match };
      const searchableFields = ["name", "title", "description", "originalName"];
      const orConditions = searchableFields
        .filter(f => model.schema?.paths?.[f])
        .map(f => ({ [f]: { $regex: fuzzyRegex } }));
      if (orConditions.length > 0) regexMatch.$or = orConditions;
      if (dateFilter) regexMatch.createdAt = dateFilter;
      if (facets.status) regexMatch.status = facets.status;
      if (facets.priority) regexMatch.priority = facetPriority;

      const results = await model.find(regexMatch)
        .skip(offset)
        .limit(limit + 1)
        .select(select)
        .lean();
      const hasMore = results.length > limit;
      return { results: results.slice(0, limit).map((r: any) => ({ ...r, _searchType: entityType, _weight: weight })), hasMore };
    }
  }

  const [
    filesResult,
    foldersResult,
    tasksResult,
    projectsResult,
    employeesResult,
    clientsResult,
    teamsResult,
  ] = await Promise.all([
    searchWithFallback(FileAttachment, { orgId, deletedAt: null }, "id orgId name originalName mimeType size uploaderId createdAt", "files", 10),
    searchWithFallback(Folder, { orgId, deletedAt: null }, "id name path parentId createdAt", "folders", 5),
    searchWithFallback(Task, { orgId }, "id orgId title description status priority createdAt", "tasks", 7),
    searchWithFallback(Project, { orgId }, "id name description status createdAt", "projects", 8),
    searchWithFallback(User, { orgId }, "id name email role createdAt", "employees", 6),
    searchWithFallback(Client, { orgId }, "id name email company createdAt", "clients", 4),
    searchWithFallback(Team, { orgId }, "id name description createdAt", "teams", 3),
  ]);

  let allResults = [
    ...filesResult.results,
    ...foldersResult.results,
    ...tasksResult.results,
    ...projectsResult.results,
    ...employeesResult.results,
    ...clientsResult.results,
    ...teamsResult.results,
  ];

  allResults.sort((a, b) => (b._weight || 0) - (a._weight || 0));
  allResults = allResults.slice(0, limit);

  const userIds = [...new Set(filesResult.results.map((f: any) => f.uploaderId).filter(Boolean))];
  let userMap = new Map<string, string>();
  if (userIds.length > 0) {
    const uploaders = await User.find({ _id: { $in: userIds } }).select("_id name").lean();
    userMap = new Map(uploaders.map(u => [u._id.toString(), u.name]));
  }

  const hasMore = filesResult.hasMore || foldersResult.hasMore || tasksResult.hasMore ||
    projectsResult.hasMore || employeesResult.hasMore || clientsResult.hasMore || teamsResult.hasMore;

  const response = {
    success: true,
    data: {
      files: filesResult.results.map((f: any) => ({ ...f, uploaderName: userMap.get(f.uploaderId) || "Unknown" })),
      folders: foldersResult.results.map((f: any) => ({ id: f.id, name: f.name, path: f.path, parentId: f.parentId })),
      tasks: tasksResult.results.map((t: any) => ({ id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority })),
      projects: projectsResult.results.map((p: any) => ({ id: p.id, name: p.name, description: p.description, status: p.status })),
      employees: employeesResult.results.map((e: any) => ({ id: e.id, name: e.name, email: e.email, role: e.role })),
      clients: clientsResult.results.map((c: any) => ({ id: c.id, name: c.name, email: c.email, company: c.company })),
      teams: teamsResult.results.map((t: any) => ({ id: t.id, name: t.name, description: t.description })),
      ranked: allResults.map((r: any) => ({
        id: r.id, type: r._searchType, weight: r._weight,
        title: r.name || r.title || r.originalName,
        description: r.description || "",
      })),
    },
    meta: {
      total: allResults.length,
      query: raw,
      type: type || "all",
      offset,
      hasMore,
      durationMs: Date.now() - startTime,
    },
  };

  cacheManager.set(cacheKey, response, SEARCH_CACHE_TTL);
  res.json(response);
});

router.get("/autocomplete", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  const raw = (req.query.q as string || "").trim().slice(0, 50);
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
  const type = req.query.type as string | undefined;

  if (!orgId) throw new AppError(400, "orgId is required");
  if (!raw || raw.length < 2) return res.json({ success: true, data: [] });

  const member = await OrgMember.findOne({ userId: req.user!.userId, orgId }).select("_id").lean();
  if (!member) throw new AppError(403, "Not authorized");

  const autocompleteRegex = buildAutocompleteRegex(raw);

  const searchNameOrTitle = (model: any, match: Record<string, any>, field: string, entityType: string) => {
    if (type && type !== entityType) return Promise.resolve([]);
    return model.find({ ...match, [field]: { $regex: autocompleteRegex } })
      .limit(limit)
      .select(`${field} id`)
      .lean();
  };

  const [files, folders, tasks, projects] = await Promise.all([
    searchNameOrTitle(FileAttachment, { orgId, deletedAt: null }, "originalName", "files"),
    searchNameOrTitle(Folder, { orgId, deletedAt: null }, "name", "folders"),
    searchNameOrTitle(Task, { orgId }, "title", "tasks"),
    searchNameOrTitle(Project, { orgId }, "name", "projects"),
  ]);

  const suggestions = [
    ...files.map((f: any) => ({ id: f.id, text: f.originalName, type: "files" })),
    ...folders.map((f: any) => ({ id: f.id, text: f.name, type: "folders" })),
    ...tasks.map((t: any) => ({ id: t.id, text: t.title, type: "tasks" })),
    ...projects.map((p: any) => ({ id: p.id, text: p.name, type: "projects" })),
  ].slice(0, limit);

  res.json({ success: true, data: suggestions });
});

router.get("/facets", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");

  const member = await OrgMember.findOne({ userId: req.user!.userId, orgId }).select("_id").lean();
  if (!member) throw new AppError(403, "Not authorized");

  const [mimeTypes, taskStatuses, projectStatuses, uploaders] = await Promise.all([
    FileAttachment.distinct("mimeType", { orgId }),
    Task.distinct("status", { orgId }),
    Project.distinct("status", { orgId }),
    FileAttachment.distinct("uploaderId", { orgId }),
  ]);

  const mimeTypeBuckets: Record<string, number> = {};
  for (const mt of mimeTypes) {
    const category = mt.split("/")[0] || "other";
    mimeTypeBuckets[category] = (mimeTypeBuckets[category] || 0) + 1;
  }

  res.json({
    success: true,
    data: {
      mimeTypes: mimeTypeBuckets,
      taskStatuses,
      projectStatuses,
    },
  });
});

export default router;
