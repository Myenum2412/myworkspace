import mongoose, { Schema, model } from "mongoose";

export interface IConversionFunnel {
  id: string;
  orgId: string;
  name: string;
  steps: { name: string; eventName: string; order: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const conversionFunnelSchema = new Schema<IConversionFunnel>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    steps: [{
      name: { type: String, required: true },
      eventName: { type: String, required: true },
      order: { type: Number, required: true },
    }],
  },
  { timestamps: true }
);

conversionFunnelSchema.index({ orgId: 1, name: 1 });

export const ConversionFunnel =
  mongoose.models.ConversionFunnel || model("ConversionFunnel", conversionFunnelSchema, "conversion_funnels");
