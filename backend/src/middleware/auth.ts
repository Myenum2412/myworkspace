import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { JwtPayload } from "../types/index.js";
import type { AuthRequest } from "../types/index.js";
export type { AuthRequest };

function tryNextAuthCookie(req: AuthRequest): JwtPayload | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map(c => c.trim());
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split("=");
    if (name === "authjs.session-token" || name === "__Secure-authjs.session-token") {
      const token = rest.join("=");
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        return {
          userId: decoded.sub || decoded.id || decoded.userId,
          email: decoded.email || "",
          role: decoded.role || "member",
        };
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice(7);
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      req.user = decoded;
      next();
      return;
    } catch {
      res.status(401).json({ success: false, error: "Invalid or expired token" });
      return;
    }
  }

  const nextAuthUser = tryNextAuthCookie(req);
  if (nextAuthUser) {
    req.user = nextAuthUser;
    next();
    return;
  }

  res.status(401).json({ success: false, error: "Authentication required" });
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice(7);
    try {
      req.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      next();
      return;
    } catch {
      // Token invalid, proceed without user
    }
  }

  const nextAuthUser = tryNextAuthCookie(req);
  if (nextAuthUser) {
    req.user = nextAuthUser;
  }
  next();
}
