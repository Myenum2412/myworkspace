import { v4 as uuid } from "uuid";
import { BlogPost, IBlogPost } from "../lib/db/models/BlogPost.js";
import { BlogCategory, IBlogCategory } from "../lib/db/models/BlogCategory.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "./audit.service.js";
import { logger } from "../lib/logger/index.js";

// ── Types ──

export interface CreatePostInput {
  orgId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  title: string;
  subtitle?: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  categories?: string[];
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  canonicalUrl?: string;
  featured?: boolean;
}

export interface UpdatePostInput extends Partial<CreatePostInput> {
  status?: "draft" | "scheduled" | "published" | "archived";
  scheduledAt?: Date;
}

export interface PostListOptions {
  orgId: string;
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
  featured?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ── Helpers ──

function calculateReadingTime(content: string): number {
  const text = content.replace(/<[^>]*>/g, "").replace(/[#*`>\-\[\]()]/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function autoGenerateExcerpt(content: string, maxLength = 160): string {
  const text = content.replace(/<[^>]*>/g, "").replace(/[#*`>\-\[\]()]/g, "").trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, "") + "...";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 200);
}

async function ensureUniqueSlug(orgId: string, slug: string, excludeId?: string): Promise<string> {
  let candidate = slug;
  let counter = 1;

  while (true) {
    const query: Record<string, any> = { orgId, slug: candidate };
    if (excludeId) query.id = { $ne: excludeId };

    const existing = await BlogPost.findOne(query).lean().exec();
    if (!existing) return candidate;

    counter++;
    candidate = `${slug}-${counter}`;
  }
}

// ── Post CRUD ──

export async function createPost(input: CreatePostInput): Promise<IBlogPost> {
  const baseSlug = slugify(input.title);
  const slug = await ensureUniqueSlug(input.orgId, baseSlug);

  const readingTime = calculateReadingTime(input.content);
  const excerpt = input.excerpt || autoGenerateExcerpt(input.content);

  const post = await BlogPost.create({
    id: uuid(),
    orgId: input.orgId,
    slug,
    title: input.title,
    subtitle: input.subtitle,
    content: input.content,
    excerpt,
    featuredImage: input.featuredImage,
    authorId: input.userId,
    authorName: input.userName,
    authorAvatar: input.userAvatar,
    status: "draft",
    categories: input.categories || [],
    tags: input.tags || [],
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    seoKeywords: input.seoKeywords,
    canonicalUrl: input.canonicalUrl,
    readingTime,
    featured: input.featured || false,
    version: 1,
    versions: [{
      content: input.content,
      title: input.title,
      savedAt: new Date(),
      savedBy: input.userId,
    }],
    createdBy: input.userId,
  });

  // Update category post counts
  if (input.categories && input.categories.length > 0) {
    await BlogCategory.updateMany(
      { orgId: input.orgId, name: { $in: input.categories } },
      { $inc: { postCount: 1 } },
    ).exec();
  }

  await recordAuditLog({
    orgId: input.orgId,
    userId: input.userId,
    action: "blog.post.created",
    entityType: "blog_post",
    entityId: post.id,
    description: `Blog post "${input.title}" created`,
    success: true,
  });

  return post;
}

export async function updatePost(
  postId: string,
  orgId: string,
  userId: string,
  input: Partial<CreatePostInput>,
): Promise<IBlogPost> {
  const post = await BlogPost.findOne({ id: postId, orgId }).exec();
  if (!post) throw new AppError(404, "Blog post not found");

  const updates: Record<string, any> = { updatedBy: userId };

  if (input.title && input.title !== post.title) {
    updates.title = input.title;
    updates.slug = await ensureUniqueSlug(orgId, slugify(input.title), postId);
  }
  if (input.subtitle !== undefined) updates.subtitle = input.subtitle;
  if (input.content !== undefined) {
    updates.content = input.content;
    updates.readingTime = calculateReadingTime(input.content);
    if (!input.excerpt) {
      updates.excerpt = autoGenerateExcerpt(input.content);
    }
    // Save version
    const versions = post.versions || [];
    versions.push({
      content: input.content,
      title: input.title || post.title,
      savedAt: new Date(),
      savedBy: userId,
    });
    if (versions.length > 50) versions.splice(0, versions.length - 50);
    updates.versions = versions;
    updates.version = (post.version || 1) + 1;
  }
  if (input.excerpt !== undefined) updates.excerpt = input.excerpt;
  if (input.featuredImage !== undefined) updates.featuredImage = input.featuredImage;
  if (input.categories !== undefined) {
    // Update category counts
    const oldCategories = post.categories || [];
    const newCategories = input.categories;
    const removed = oldCategories.filter(c => !newCategories.includes(c));
    const added = newCategories.filter(c => !oldCategories.includes(c));

    if (removed.length > 0) {
      await BlogCategory.updateMany(
        { orgId, name: { $in: removed } },
        { $inc: { postCount: -1 } },
      ).exec();
    }
    if (added.length > 0) {
      await BlogCategory.updateMany(
        { orgId, name: { $in: added } },
        { $inc: { postCount: 1 } },
      ).exec();
    }
    updates.categories = input.categories;
  }
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.seoTitle !== undefined) updates.seoTitle = input.seoTitle;
  if (input.seoDescription !== undefined) updates.seoDescription = input.seoDescription;
  if (input.seoKeywords !== undefined) updates.seoKeywords = input.seoKeywords;
  if (input.canonicalUrl !== undefined) updates.canonicalUrl = input.canonicalUrl;
  if (input.featured !== undefined) updates.featured = input.featured;

  const updated = await BlogPost.findOneAndUpdate(
    { id: postId, orgId },
    { $set: updates },
    { new: true },
  ).exec();

  if (!updated) throw new AppError(404, "Blog post not found");

  await recordAuditLog({
    orgId,
    userId,
    action: "blog.post.updated",
    entityType: "blog_post",
    entityId: postId,
    description: `Blog post "${updated.title}" updated`,
    success: true,
  });

  return updated;
}

export async function deletePost(postId: string, orgId: string, userId: string): Promise<void> {
  const post = await BlogPost.findOne({ id: postId, orgId }).exec();
  if (!post) throw new AppError(404, "Blog post not found");

  // Archive instead of hard delete
  post.status = "archived";
  post.updatedBy = userId;
  await post.save();

  await recordAuditLog({
    orgId,
    userId,
    action: "blog.post.archived",
    entityType: "blog_post",
    entityId: postId,
    description: `Blog post "${post.title}" archived`,
    success: true,
  });
}

export async function permanentDeletePost(postId: string, orgId: string, userId: string): Promise<void> {
  const post = await BlogPost.findOneAndDelete({ id: postId, orgId }).exec();
  if (!post) throw new AppError(404, "Blog post not found");

  // Update category counts
  if (post.categories && post.categories.length > 0) {
    await BlogCategory.updateMany(
      { orgId, name: { $in: post.categories } },
      { $inc: { postCount: -1 } },
    ).exec();
  }

  await recordAuditLog({
    orgId,
    userId,
    action: "blog.post.deleted",
    entityType: "blog_post",
    entityId: postId,
    description: `Blog post "${post.title}" permanently deleted`,
    success: true,
  });
}

export async function restorePost(postId: string, orgId: string, userId: string): Promise<IBlogPost> {
  const post = await BlogPost.findOne({ id: postId, orgId }).exec();
  if (!post) throw new AppError(404, "Blog post not found");
  if (post.status !== "archived") throw new AppError(400, "Post is not archived");

  post.status = "draft";
  post.updatedBy = userId;
  await post.save();

  await recordAuditLog({
    orgId,
    userId,
    action: "blog.post.restored",
    entityType: "blog_post",
    entityId: postId,
    description: `Blog post "${post.title}" restored`,
    success: true,
  });

  return post;
}

export async function publishPost(postId: string, orgId: string, userId: string): Promise<IBlogPost> {
  const post = await BlogPost.findOne({ id: postId, orgId }).exec();
  if (!post) throw new AppError(404, "Blog post not found");

  post.status = "published";
  post.publishedAt = new Date();
  post.updatedBy = userId;
  await post.save();

  await recordAuditLog({
    orgId,
    userId,
    action: "blog.post.published",
    entityType: "blog_post",
    entityId: postId,
    description: `Blog post "${post.title}" published`,
    success: true,
  });

  return post;
}

export async function unpublishPost(postId: string, orgId: string, userId: string): Promise<IBlogPost> {
  const post = await BlogPost.findOne({ id: postId, orgId }).exec();
  if (!post) throw new AppError(404, "Blog post not found");

  post.status = "draft";
  post.publishedAt = undefined;
  post.updatedBy = userId;
  await post.save();

  await recordAuditLog({
    orgId,
    userId,
    action: "blog.post.unpublished",
    entityType: "blog_post",
    entityId: postId,
    description: `Blog post "${post.title}" unpublished`,
    success: true,
  });

  return post;
}

// ── Queries ──

export async function getPublishedPosts(options: PostListOptions) {
  const { orgId, page = 1, limit = 12, category, search, featured } = options;

  const filter: Record<string, any> = { orgId, status: "published" };
  if (category) filter.categories = category;
  if (featured) filter.featured = true;
  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    BlogPost.find(filter)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-content -versions")
      .lean()
      .exec(),
    BlogPost.countDocuments(filter).exec(),
  ]);

  return {
    data: posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPostBySlug(slug: string, orgId: string): Promise<IBlogPost> {
  const post = await BlogPost.findOne({ slug, orgId, status: "published" }).exec();
  if (!post) throw new AppError(404, "Blog post not found");

  // Increment views
  await BlogPost.updateOne({ id: post.id }, { $inc: { views: 1 } }).exec();

  return post;
}

export async function getFeaturedPosts(orgId: string, limit = 3): Promise<any[]> {
  return BlogPost.find({ orgId, status: "published", featured: true })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .select("-content -versions")
    .lean()
    .exec();
}

export async function getAdminPosts(options: PostListOptions) {
  const { orgId, page = 1, limit = 20, status, category, search, sortBy = "createdAt", sortOrder = "desc" } = options;

  const filter: Record<string, any> = { orgId };
  if (status) filter.status = status;
  if (category) filter.categories = category;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [posts, total] = await Promise.all([
    BlogPost.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("-versions")
      .lean()
      .exec(),
    BlogPost.countDocuments(filter).exec(),
  ]);

  return {
    data: posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPostById(postId: string, orgId: string): Promise<IBlogPost> {
  const post = await BlogPost.findOne({ id: postId, orgId }).exec();
  if (!post) throw new AppError(404, "Blog post not found");
  return post;
}

// ── Categories ──

export async function getCategories(orgId: string): Promise<any[]> {
  return BlogCategory.find({ orgId }).sort({ name: 1 }).lean().exec();
}

export async function createCategory(
  orgId: string,
  userId: string,
  name: string,
  description?: string,
): Promise<IBlogCategory> {
  const slug = slugify(name);

  const existing = await BlogCategory.findOne({ orgId, slug }).lean().exec();
  if (existing) throw new AppError(400, "Category already exists");

  return BlogCategory.create({
    id: uuid(),
    orgId,
    name,
    slug,
    description,
    postCount: 0,
    createdBy: userId,
  });
}

export async function updateCategory(
  categoryId: string,
  orgId: string,
  name: string,
  description?: string,
): Promise<IBlogCategory> {
  const category = await BlogCategory.findOneAndUpdate(
    { id: categoryId, orgId },
    { $set: { name, slug: slugify(name), description } },
    { new: true },
  ).exec();

  if (!category) throw new AppError(404, "Category not found");
  return category;
}

export async function deleteCategory(categoryId: string, orgId: string): Promise<void> {
  const category = await BlogCategory.findOneAndDelete({ id: categoryId, orgId }).exec();
  if (!category) throw new AppError(404, "Category not found");

  // Remove category from all posts
  await BlogPost.updateMany(
    { orgId, categories: category.name },
    { $pull: { categories: category.name } },
  ).exec();
}

// ── Sitemap ──

export async function getSitemapData(orgId: string) {
  const posts = await BlogPost.find({ orgId, status: "published" })
    .select("slug publishedAt updatedAt")
    .sort({ publishedAt: -1 })
    .lean()
    .exec();

  return posts.map(p => ({
    slug: p.slug,
    lastModified: p.updatedAt,
    publishedAt: p.publishedAt,
  }));
}
