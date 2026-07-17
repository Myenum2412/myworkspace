import { Schema, model, Document } from "mongoose";

export interface ILrmEntity extends Document {
  id: string;
  type: "user" | "project" | "task" | "file" | "client" | "team" | "organization" | "conversation" | "document";
  name: string;
  orgId: string;
  metadata: Record<string, unknown>;
  embedding: number[] | null;
  createdAt: Date;
}

const lrmEntitySchema = new Schema<ILrmEntity>(
  {
    id: { type: String, required: true, unique: true },
    type: { type: String, required: true, index: true },
    name: { type: String, required: true },
    orgId: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    embedding: { type: [Number], default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "lrm_entities" }
);

lrmEntitySchema.index({ orgId: 1, type: 1 });
lrmEntitySchema.index({ name: "text", orgId: 1 });

export const LrmEntity = model<ILrmEntity>("LrmEntity", lrmEntitySchema);
