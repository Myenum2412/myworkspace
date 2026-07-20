import { Schema, model, Document } from "mongoose";

export interface IStatusTransition {
  status: "online" | "break" | "offline";
  timestamp: Date;
}

export interface ISession extends Document {
  userId: string;
  orgId: string;
  loginTime: Date;
  logoutTime?: Date;
  currentStatus: "online" | "break" | "offline";
  statusTransitions: IStatusTransition[];
  totalBreakDuration: number;
  duration?: number;
  expiresAt: Date;
  deviceFingerprint?: string;
  sessionFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  lastActivityAt: Date;
  isActive: boolean;
  terminatedBy?: string;
  terminationReason?: string;
  anomalyScore: number;
  anomalyFlags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const statusTransitionSchema = new Schema<IStatusTransition>({
  status: { type: String, enum: ["online", "break", "offline"], required: true },
  timestamp: { type: Date, required: true },
}, { _id: false });

const sessionSchema = new Schema<ISession>({
  userId: { type: String, required: true, index: true },
  orgId: { type: String, required: true, index: true },
  loginTime: { type: Date, required: true, default: Date.now },
  logoutTime: { type: Date },
  currentStatus: { type: String, enum: ["online", "break", "offline"], default: "online" },
  statusTransitions: { type: [statusTransitionSchema], default: [] },
  totalBreakDuration: { type: Number, default: 0 },
  duration: { type: Number },
  expiresAt: { type: Date, required: true },
  deviceFingerprint: { type: String },
  sessionFingerprint: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  browser: { type: String },
  os: { type: String },
  deviceType: { type: String, enum: ["desktop", "mobile", "tablet"] },
  lastActivityAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true, index: true },
  terminatedBy: { type: String },
  terminationReason: { type: String },
  anomalyScore: { type: Number, default: 0 },
  anomalyFlags: { type: [String], default: [] },
}, { timestamps: true });

// Indexes for efficient queries
sessionSchema.index({ userId: 1, loginTime: -1 });
sessionSchema.index({ orgId: 1, userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ orgId: 1, isActive: 1 });
sessionSchema.index({ lastActivityAt: 1 });

/**
 * Maximum concurrent sessions per user (configurable per org in production).
 */
export const MAX_CONCURRENT_SESSIONS = 5;

/**
 * Session timeout (30 minutes of inactivity).
 */
export const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Check if a session has timed out due to inactivity.
 */
export function isSessionTimedOut(session: ISession): boolean {
  if (!session.isActive) return false;
  const lastActivity = session.lastActivityAt?.getTime() || session.loginTime.getTime();
  return Date.now() - lastActivity > SESSION_INACTIVITY_TIMEOUT_MS;
}

/**
 * Update session activity timestamp.
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  await Session.updateOne(
    { _id: sessionId },
    { $set: { lastActivityAt: new Date() } },
  ).exec();
}

/**
 * Terminate a session.
 */
export async function terminateSession(
  sessionId: string,
  terminatedBy?: string,
  reason?: string,
): Promise<void> {
  await Session.updateOne(
    { _id: sessionId },
    {
      $set: {
        isActive: false,
        currentStatus: "offline",
        logoutTime: new Date(),
        terminatedBy,
        terminationReason: reason,
      },
    },
  ).exec();
}

/**
 * Terminate all sessions for a user except the current one.
 */
export async function terminateAllOtherSessions(
  userId: string,
  currentSessionId: string,
  terminatedBy?: string,
  reason?: string,
): Promise<number> {
  const result = await Session.updateMany(
    { userId, _id: { $ne: currentSessionId }, isActive: true },
    {
      $set: {
        isActive: false,
        currentStatus: "offline",
        logoutTime: new Date(),
        terminatedBy,
        terminationReason: reason || "Terminated by user",
      },
    },
  ).exec();

  return result.modifiedCount;
}

/**
 * Get active sessions count for a user.
 */
export async function getActiveSessionCount(userId: string): Promise<number> {
  return Session.countDocuments({ userId, isActive: true }).exec();
}

/**
 * Get all active sessions for a user.
 */
export async function getActiveSessions(userId: string): Promise<any[]> {
  return Session.find({ userId, isActive: true })
    .sort({ lastActivityAt: -1 })
    .lean()
    .exec();
}

/**
 * Record anomaly flag on a session.
 */
export async function flagSessionAnomaly(
  sessionId: string,
  flag: string,
  scoreIncrease: number = 10,
): Promise<void> {
  await Session.updateOne(
    { _id: sessionId },
    {
      $push: { anomalyFlags: flag },
      $inc: { anomalyScore: scoreIncrease },
    },
  ).exec();
}

export const Session = model<ISession>("Session", sessionSchema);
