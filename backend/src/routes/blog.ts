import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { isAdminRole } from "../lib/rbac/index.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { cacheEnhanced } from "../middleware/cache-enhanced.js";
import { requireString, optionalString, optionalArray } from "../lib/validate.js";
import * as blogService from "../services/blog.service.js";

const router = Router();

// ── Public Routes (no auth) ──

router.get("/", cacheEnhanced({ ttl: 30, varyByOrg: true, tags: ["blog"] }), async (req, res) => {
  const orgId = req.query.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const featured = req.query.featured === "true";

  const result = await blogService.getPublishedPosts({ orgId, page, limit, category, search, featured });
  res.json({ success: true, data: result.data, pagination: result.pagination });
});

router.get("/categories", cacheEnhanced({ ttl: 60, varyByOrg: true, tags: ["blog"] }), async (req, res) => {
  const orgId = req.query.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");

  const categories = await blogService.getCategories(orgId);
  res.json({ success: true, data: categories });
});

router.get("/sitemap", async (req, res) => {
  const orgId = req.query.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");

  const data = await blogService.getSitemapData(orgId);
  res.json({ success: true, data });
});

router.get("/:slug", cacheEnhanced({ ttl: 60, varyByOrg: true, tags: ["blog"] }), async (req, res) => {
  const orgId = req.query.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");

  const post = await blogService.getPostBySlug(req.params.slug, orgId);
  res.json({ success: true, data: post });
});

// ── Admin Routes (auth required) ──

router.use(authenticate);

router.get("/admin", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembership(req.user!.userId);
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const status = req.query.status as string | undefined;
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

  const result = await blogService.getAdminPosts({
    orgId, page, limit, status, category, search, sortBy, sortOrder,
  });

  res.json({ success: true, data: result.data, pagination: result.pagination });
});

router.get("/admin/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembership(req.user!.userId);
  const post = await blogService.getPostById(req.params.id, orgId);
  res.json({ success: true, data: post });
});

router.post("/admin", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can create blog posts");

  const orgId = await requireOrgMembership(req.user!.userId);
  const title = requireString(req.body.title, "title", { min: 1, max: 500 });
  const content = requireString(req.body.content, "content", { min: 1 });
  const subtitle = optionalString(req.body.subtitle, "subtitle", { max: 500 });
  const excerpt = optionalString(req.body.excerpt, "excerpt", { max: 500 });
  const featuredImage = optionalString(req.body.featuredImage, "featuredImage");
  const categories = (optionalArray(req.body.categories, "categories") || []) as string[];
  const tags = (optionalArray(req.body.tags, "tags") || []) as string[];
  const seoTitle = optionalString(req.body.seoTitle, "seoTitle", { max: 200 });
  const seoDescription = optionalString(req.body.seoDescription, "seoDescription", { max: 500 });
  const seoKeywords = (optionalArray(req.body.seoKeywords, "seoKeywords")) as string[] | undefined;
  const canonicalUrl = optionalString(req.body.canonicalUrl, "canonicalUrl");
  const featured = req.body.featured === true;

  const post = await blogService.createPost({
    orgId,
    userId: req.user!.userId,
    userName: req.user!.email || "Admin",
    title,
    content,
    subtitle,
    excerpt,
    featuredImage,
    categories,
    tags,
    seoTitle,
    seoDescription,
    seoKeywords,
    canonicalUrl,
    featured,
  });

  res.status(201).json({ success: true, data: post });
});

router.put("/admin/:id", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can update blog posts");

  const orgId = await requireOrgMembership(req.user!.userId);

  const post = await blogService.updatePost(req.params.id, orgId, req.user!.userId, {
    title: req.body.title,
    subtitle: req.body.subtitle,
    content: req.body.content,
    excerpt: req.body.excerpt,
    featuredImage: req.body.featuredImage,
    categories: req.body.categories,
    tags: req.body.tags,
    seoTitle: req.body.seoTitle,
    seoDescription: req.body.seoDescription,
    seoKeywords: req.body.seoKeywords,
    canonicalUrl: req.body.canonicalUrl,
    featured: req.body.featured,
  });

  res.json({ success: true, data: post });
});

router.delete("/admin/:id", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can delete blog posts");

  const orgId = await requireOrgMembership(req.user!.userId);
  await blogService.deletePost(req.params.id, orgId, req.user!.userId);

  res.json({ success: true, message: "Post archived" });
});

router.post("/admin/:id/permanent-delete", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can permanently delete blog posts");

  const orgId = await requireOrgMembership(req.user!.userId);
  await blogService.permanentDeletePost(req.params.id, orgId, req.user!.userId);

  res.json({ success: true, message: "Post permanently deleted" });
});

router.post("/admin/:id/publish", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can publish blog posts");

  const orgId = await requireOrgMembership(req.user!.userId);
  const post = await blogService.publishPost(req.params.id, orgId, req.user!.userId);

  res.json({ success: true, data: post });
});

router.post("/admin/:id/unpublish", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can unpublish blog posts");

  const orgId = await requireOrgMembership(req.user!.userId);
  const post = await blogService.unpublishPost(req.params.id, orgId, req.user!.userId);

  res.json({ success: true, data: post });
});

router.post("/admin/:id/restore", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can restore blog posts");

  const orgId = await requireOrgMembership(req.user!.userId);
  const post = await blogService.restorePost(req.params.id, orgId, req.user!.userId);

  res.json({ success: true, data: post });
});

// ── Category Admin Routes ──

router.get("/admin/categories/all", async (req: AuthRequest, res: Response) => {
  const orgId = await requireOrgMembership(req.user!.userId);
  const categories = await blogService.getCategories(orgId);
  res.json({ success: true, data: categories });
});

router.post("/admin/categories", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can manage categories");

  const orgId = await requireOrgMembership(req.user!.userId);
  const name = requireString(req.body.name, "name", { min: 1, max: 100 });
  const description = optionalString(req.body.description, "description", { max: 500 });

  const category = await blogService.createCategory(orgId, req.user!.userId, name, description);
  res.status(201).json({ success: true, data: category });
});

router.put("/admin/categories/:id", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can manage categories");

  const orgId = await requireOrgMembership(req.user!.userId);
  const name = requireString(req.body.name, "name", { min: 1, max: 100 });
  const description = optionalString(req.body.description, "description", { max: 500 });

  const category = await blogService.updateCategory(req.params.id, orgId, name, description);
  res.json({ success: true, data: category });
});

router.delete("/admin/categories/:id", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can manage categories");

  const orgId = await requireOrgMembership(req.user!.userId);
  await blogService.deleteCategory(req.params.id, orgId);

  res.json({ success: true, message: "Category deleted" });
});

export default router;
