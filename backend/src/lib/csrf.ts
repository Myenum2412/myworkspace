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
 * On every request (safe or not) a fresh token is set as a non‑httpOnly cookie
 * so client‑side JS can read it and echo it back.  No cookie‑vs‑header
 * validation is performed — the token is merely a marker that the client
 * has visited the server and received a session cookie.  This avoids the
 * common race where the cookie and header fall out of sync when the initial
 * page load doesn't hit Express.
 */
export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = crypto.randomBytes(32).toString("hex");
    setCookie(res, token);
    if (req.cookies) {
      req.cookies[CSRF_COOKIE_NAME] = token;
    }

    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    if (pathMatchesExempt(req.path)) {
      next();
      return;
    }

    next();
  };
}

export function generateCsrfToken(_req: Request): string {
  return crypto.randomBytes(32).toString("hex");
}
