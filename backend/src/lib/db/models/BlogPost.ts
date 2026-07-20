import { Schema, model, Document } from "mongoose";

export interface IBlogVersion {
  content: string;
  title: string;
  savedAt: Date;
  savedBy: string;
}

export interface IBlogPost extends Document {
  id: string;
  orgId: string;
  slug: string;
  title: string;
  subtitle?: string;
  content: string;
  excerpt: string;
  featuredImage?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  status: "draft" | "scheduled" | "published" | "archived";
  publishedAt?: Date;
  scheduledAt?: Date;
  categories: string[];
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  canonicalUrl?: string;
  readingTime: number;
  views: number;
  featured: boolean;
  version: number;
  versions: IBlogVersion[];
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const blogVersionSchema = new Schema<IBlogVersion>({
  content: { type: String, required: true },
  title: { type: String, required: true },
  savedAt: { type: Date, required: true },
  savedBy: { type: String, required: true },
}, { _id: false });

const blogPostSchema = new Schema<IBlogPost>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    content: { type: String, required: true },
    excerpt: { type: String, required: true },
    featuredImage: { type: String },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "archived"],
      default: "draft",
      required: true,
    },
    publishedAt: { type: Date },
    scheduledAt: { type: Date },
    categories: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    seoTitle: { type: String },
    seoDescription: { type: String },
    seoKeywords: { type: [String] },
    canonicalUrl: { type: String },
    readingTime: { type: Number, default: 1 },
    views: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    versions: { type: [blogVersionSchema], default: [] },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

blogPostSchema.index({ orgId: 1, slug: 1 }, { unique: true });
blogPostSchema.index({ orgId: 1, status: 1 });
blogPostSchema.index({ orgId: 1, publishedAt: -1 });
blogPostSchema.index({ orgId: 1, categories: 1 });
blogPostSchema.index({ orgId: 1, featured: 1, publishedAt: -1 });
blogPostSchema.index({ orgId: 1, title: "text", content: "text", tags: "text" });

export const BlogPost = model<IBlogPost>("BlogPost", blogPostSchema);
