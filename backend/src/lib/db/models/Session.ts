import { Schema, model, Document } from "mongoose";

export interface IStatusTransition {
  status: "online" | "break" | "offline";
  timestamp: Date;
}

export interface ISession extends Document {
  userId: string;
  orgId?: string;
  loginTime: Date;
  logoutTime?: Date;
  currentStatus: "online" | "break" | "offline";
  statusTransitions: IStatusTransition[];
  totalBreakDuration: number;
  duration?: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const statusTransitionSchema = new Schema<IStatusTransition>({
  status: { type: String, enum: ["online", "break", "offline"], required: true },
  timestamp: { type: Date, required: true },
}, { _id: false });

const sessionSchema = new Schema<ISession>({
  userId: { type: String, required: true, index: true },
  orgId: { type: String, index: true },
  loginTime: { type: Date, required: true, default: Date.now },
  logoutTime: { type: Date },
  currentStatus: { type: String, enum: ["online", "break", "offline"], default: "online" },
  statusTransitions: { type: [statusTransitionSchema], default: [] },
  totalBreakDuration: { type: Number, default: 0 },
  duration: { type: Number },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

sessionSchema.index({ userId: 1, loginTime: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = model<ISession>("Session", sessionSchema);
