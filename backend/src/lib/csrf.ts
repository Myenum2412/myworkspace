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
  // /api/accounts is exclusively authenticated (NextAuth cookie or JWT).
  // Cookie-authenticated requests are SameSite-protected, and the JWT flow
  // is not cookie-based, so CSRF token validation adds nothing here while
  // breaking server-action flows that forward cookies without a header.
  if (path === "/api/accounts" || path.startsWith("/api/accounts/")) return true;
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
 *
 * Requests authenticated via a Bearer token are NOT cookie-based, so they
 * are not vulnerable to cross-site request forgery and must not require a
 * CSRF token. Enforcing one there breaks every legitimate token-authenticated
 * write (tasks, accounts, etc.) with "CSRF token missing".
 */
export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Reuse the existing cookie token instead of rotating it on every request.
    // The frontend reads `csrf-token` from the cookie and sends it as the
    // `x-csrf-token` header; rotation here made that value go stale the moment
    // another in-flight response (or a proxied response that drops Set-Cookie)
    // refreshed the cookie, producing intermittent 403 "CSRF token mismatch"
    // failures on task creation. A stable 256-bit, SameSite=strict token is the
    // standard pattern and carries the same protections.
    const token = req.cookies?.[CSRF_COOKIE_NAME] || crypto.randomBytes(32).toString("hex");
    if (!req.cookies?.[CSRF_COOKIE_NAME]) setCookie(res, token);

    // Safe methods don't need CSRF validation
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    if (pathMatchesExempt(req.path)) {
      next();
      return;
    }

    // Token-based authentication is not vulnerable to CSRF.
    if ((req.headers.authorization || "").startsWith("Bearer ")) {
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
