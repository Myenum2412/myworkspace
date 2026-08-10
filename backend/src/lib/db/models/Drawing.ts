import { type Document, model, Schema } from "mongoose";

export interface IDrawingSummary {
  totalEntities: number;
  lines: number;
  polylines: number;
  circles: number;
  otherEntities: number;
  layers: string[];
}

export interface IDrawing extends Document {
  drawingName: string;
  userId: string;
  orgId: string;
  sourceFile?: string;
  status: string;
  summary: IDrawingSummary;
  entities: Array<Record<string, unknown>>;
  metadata?: {
    pluginVersion?: string;
    autocadVersion?: string;
    exportedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const drawingSummarySchema = new Schema<IDrawingSummary>(
  {
    totalEntities: { type: Number, default: 0 },
    lines: { type: Number, default: 0 },
    polylines: { type: Number, default: 0 },
    circles: { type: Number, default: 0 },
    otherEntities: { type: Number, default: 0 },
    layers: { type: [String], default: [] },
  },
  { _id: false },
);

const drawingSchema = new Schema<IDrawing>({
  drawingName: { type: String, required: true, trim: true, maxlength: 255 },
  userId: { type: String, required: true, index: true },
  orgId: { type: String, required: true, index: true },
  sourceFile: { type: String, default: undefined },
  status: { type: String, default: "available", enum: ["available", "archived"] },
  summary: { type: drawingSummarySchema, default: () => ({}) },
  entities: { type: Schema.Types.Mixed, default: [] },
  metadata: { type: Schema.Types.Mixed, default: undefined },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

drawingSchema.index({ orgId: 1, createdAt: -1 }, { name: "idx_drawings_org_created" });
drawingSchema.index({ userId: 1, createdAt: -1 }, { name: "idx_drawings_user_created" });

export const Drawing = model<IDrawing>("Drawing", drawingSchema, "drawings");
