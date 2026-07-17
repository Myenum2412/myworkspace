import { Schema, model, Document } from "mongoose";

export interface ILrmLearningEvent extends Document {
  id: string;
  orgId: string;
  userId: string;
  eventType: "feedback" | "correction" | "workflow_completed" | "suggestion_accepted" | "interaction";
  source: string;
  data: Record<string, unknown>;
  outcome: "positive" | "negative" | "neutral";
  weight: number;
  createdAt: Date;
}

const lrmLearningEventSchema = new Schema<ILrmLearningEvent>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    eventType: {
      type: String, required: true,
      enum: ["feedback", "correction", "workflow_completed", "suggestion_accepted", "interaction"],
    },
    source: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    outcome: { type: String, enum: ["positive", "negative", "neutral"], default: "neutral" },
    weight: { type: Number, default: 1, min: 0, max: 10 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "lrm_learning_events" }
);

lrmLearningEventSchema.index({ orgId: 1, eventType: 1, createdAt: -1 });
lrmLearningEventSchema.index({ userId: 1, createdAt: -1 });

export const LrmLearningEvent = model<ILrmLearningEvent>("LrmLearningEvent", lrmLearningEventSchema);
