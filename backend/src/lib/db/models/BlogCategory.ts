import { Schema, model, Document } from "mongoose";

export interface IBlogCategory extends Document {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const blogCategorySchema = new Schema<IBlogCategory>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    postCount: { type: Number, default: 0 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

blogCategorySchema.index({ orgId: 1, slug: 1 }, { unique: true });
blogCategorySchema.index({ orgId: 1, name: 1 });

export const BlogCategory = model<IBlogCategory>("BlogCategory", blogCategorySchema);
