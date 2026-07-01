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

export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    if (pathMatchesExempt(req.path)) {
      next();
      return;
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string;

    if (cookieToken && headerToken && crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken),
    )) {
      next();
      return;
    }

    if (!cookieToken) {
      const token = crypto.randomBytes(32).toString("hex");
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: CSRF_COOKIE_MAX_AGE,
        path: "/",
      });
    }

    res.status(403).json({
      success: false,
      error: "CSRF token validation failed",
    });
  };
}

export function generateCsrfToken(req: Request): string {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  if (existing) return existing;

  const token = crypto.randomBytes(32).toString("hex");
  return token;
}
