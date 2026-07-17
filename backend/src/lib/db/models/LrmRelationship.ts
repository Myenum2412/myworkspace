import { Schema, model, Document } from "mongoose";

export interface ILrmRelationship extends Document {
  id: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relationship: string;
  strength: number;
  metadata: Record<string, unknown>;
  orgId: string;
  createdAt: Date;
}

const lrmRelationshipSchema = new Schema<ILrmRelationship>(
  {
    id: { type: String, required: true, unique: true },
    sourceId: { type: String, required: true, index: true },
    sourceType: { type: String, required: true },
    targetId: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    relationship: { type: String, required: true },
    strength: { type: Number, default: 0.5, min: 0, max: 1 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    orgId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "lrm_relationships" }
);

lrmRelationshipSchema.index({ sourceId: 1, targetId: 1 }, { unique: true });
lrmRelationshipSchema.index({ orgId: 1, relationship: 1 });
lrmRelationshipSchema.index({ sourceType: 1, targetType: 1 });

export const LrmRelationship = model<ILrmRelationship>("LrmRelationship", lrmRelationshipSchema);
