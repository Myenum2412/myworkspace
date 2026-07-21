import { Response, NextFunction } from "express";
import { MfaSession } from "../lib/db/models/MfaSession.js";
import { AuthRequest } from "./auth.js";
import { AppError } from "./error.js";

const STEP_UP_WINDOW_MS = 15 * 60 * 1000;

export function requireStepUp() {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const sessionId = req.headers["x-session-id"] as string;

    const recentMfa = await MfaSession.findOne({
      userId: req.user.userId,
      mfaVerified: true,
      sessionId,
      mfaVerifiedAt: { $gte: new Date(Date.now() - STEP_UP_WINDOW_MS) },
    }).sort({ mfaVerifiedAt: -1 }).lean();

    if (recentMfa) {
      next();
      return;
    }

    throw new AppError(403, "Step-up authentication required. Please re-verify your identity with a TOTP code.");
  };
}

export async function verifyStepUp(
  userId: string,
  sessionId: string,
  totpToken: string,
): Promise<boolean> {
  const { verifyTOTP } = await import("../services/totp.service.js");

  const verified = await verifyTOTP(userId, totpToken, {
    orgId: userId,
  });

  if (!verified) return false;

  await MfaSession.updateOne(
    { userId, sessionId },
    {
      $set: {
        mfaVerified: true,
        mfaMethod: "totp",
        mfaVerifiedAt: new Date(),
      },
      $setOnInsert: {
        userId,
        sessionId,
        authMethod: "password",
        orgId: "",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true },
  );

  return true;
}

export async function invalidateMfaSessions(userId: string, exceptSessionId?: string): Promise<void> {
  const filter: any = { userId, expiresAt: { $gt: new Date() } };
  if (exceptSessionId) {
    filter.sessionId = { $ne: exceptSessionId };
  }
  await MfaSession.updateMany(filter, {
    $set: { expiresAt: new Date() },
  });
}
