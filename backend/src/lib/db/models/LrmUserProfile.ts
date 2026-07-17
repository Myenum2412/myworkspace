import { Schema, model, Document } from "mongoose";

export interface ILrmUserProfile extends Document {
  userId: string;
  orgId: string;
  expertise: string[];
  preferences: Record<string, unknown>;
  interactionPatterns: {
    preferredModel?: string;
    preferredResponseLength?: string;
    commonTopics: string[];
    activeHours: string[];
    averageSessionLength: number;
  };
  learnedContext: Record<string, unknown>;
  feedbackCount: number;
  lastUpdated: Date;
}

const lrmUserProfileSchema = new Schema<ILrmUserProfile>(
  {
    userId: { type: String, required: true },
    orgId: { type: String, required: true },
    expertise: { type: [String], default: [] },
    preferences: { type: Schema.Types.Mixed, default: {} },
    interactionPatterns: {
      preferredModel: { type: String },
      preferredResponseLength: { type: String },
      commonTopics: { type: [String], default: [] },
      activeHours: { type: [String], default: [] },
      averageSessionLength: { type: Number, default: 0 },
    },
    learnedContext: { type: Schema.Types.Mixed, default: {} },
    feedbackCount: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "lrm_user_profiles" }
);

lrmUserProfileSchema.index({ userId: 1, orgId: 1 }, { unique: true });

export const LrmUserProfile = model<ILrmUserProfile>("LrmUserProfile", lrmUserProfileSchema);
