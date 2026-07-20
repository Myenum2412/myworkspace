import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env.js";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

const CSRF_EXEMPT_PATHS = new Set([
  "/api/health",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/send-signup-otp",
  "/api/auth/verify-signup-otp",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/client-auth/login",
  "/api/files-tus",
]);

function pathMatchesExempt(path: string): boolean {
  if (CSRF_EXEMPT_PATHS.has(path)) return true;
  if (path.startsWith("/api/files-tus/")) return true;
  return false;
}

function setCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: CSRF_COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * CSRF protection middleware.
 *
 * Sets a random token as a non-httpOnly cookie on every request.
 * For unsafe methods (POST/PUT/PATCH/DELETE), validates that the
 * x-csrf-token header matches the cookie value.
 */
export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = crypto.randomBytes(32).toString("hex");
    setCookie(res, token);

    // Safe methods don't need CSRF validation
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    if (pathMatchesExempt(req.path)) {
      next();
      return;
    }

    // Validate CSRF token for unsafe methods
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

    if (!cookieToken || !headerToken) {
      res.status(403).json({ success: false, error: "CSRF token missing" });
      return;
    }

    // Constant-time comparison to prevent timing attacks
    const cookieBuf = Buffer.from(cookieToken, "hex");
    const headerBuf = Buffer.from(headerToken, "hex");

    if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
      res.status(403).json({ success: false, error: "CSRF token mismatch" });
      return;
    }

    next();
  };
}

export function generateCsrfToken(_req: Request): string {
  return crypto.randomBytes(32).toString("hex");
}
