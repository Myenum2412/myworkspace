import { Schema, model, Document } from "mongoose";

export interface ILrmMemory extends Document {
  id: string;
  orgId: string;
  userId: string | null;
  tier: "working" | "short-term" | "long-term" | "episodic" | "semantic";
  content: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  importance: number;
  accessCount: number;
  lastAccessedAt: Date;
  createdAt: Date;
  expiresAt: Date | null;
}

const lrmMemorySchema = new Schema<ILrmMemory>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    userId: { type: String, default: null, index: true },
    tier: {
      type: String, required: true,
      enum: ["working", "short-term", "long-term", "episodic", "semantic"],
    },
    content: { type: String, required: true },
    embedding: { type: [Number], default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    importance: { type: Number, default: 0.5, min: 0, max: 1 },
    accessCount: { type: Number, default: 0 },
    lastAccessedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "lrm_memories" }
);

lrmMemorySchema.index({ orgId: 1, tier: 1, importance: -1 });
lrmMemorySchema.index({ orgId: 1, userId: 1, tier: 1 });
lrmMemorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
lrmMemorySchema.index({ orgId: 1, tier: 1, lastAccessedAt: -1 });

export const LrmMemory = model<ILrmMemory>("LrmMemory", lrmMemorySchema);
