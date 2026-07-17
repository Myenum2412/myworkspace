import { Schema, model, Document } from "mongoose";

export interface ILrmCouncilSession extends Document {
  id: string;
  orgId: string;
  userId: string;
  problem: string;
  mode: "full" | "quick" | "duo";
  members: string[];
  rounds: {
    round: number;
    responses: {
      agentId: string;
      content: string;
      confidence: number;
    }[];
  }[];
  verdict: {
    summary: string;
    consensusLevel: string;
    confidence: number;
    chairmanVerdict: string;
  } | null;
  executionTimeMs: number;
  createdAt: Date;
}

const lrmCouncilSessionSchema = new Schema<ILrmCouncilSession>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    problem: { type: String, required: true },
    mode: { type: String, enum: ["full", "quick", "duo"], required: true },
    members: { type: [String], required: true },
    rounds: [{
      round: { type: Number, required: true },
      responses: [{
        agentId: { type: String, required: true },
        content: { type: String, required: true },
        confidence: { type: Number, default: 0.5 },
      }],
    }],
    verdict: {
      summary: { type: String },
      consensusLevel: { type: String, enum: ["unanimous", "majority", "split", "deadlocked"] },
      confidence: { type: Number },
      chairmanVerdict: { type: String },
    },
    executionTimeMs: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "lrm_council_sessions" }
);

export const LrmCouncilSession = model<ILrmCouncilSession>("LrmCouncilSession", lrmCouncilSessionSchema);
