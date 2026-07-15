import { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/index.js";
export type { AuthRequest };
/**
 * Middleware that only validates NextAuth session cookie (no Bearer token).
 * Used by AI routes which are only accessible through workspace/staff pages.
 */
export declare function requireNextAuthSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Resolve a stale userId from the JWT by looking up the user by email.
 * Called after authenticate to update req.user.userId if needed.
 * Optimized: parallelized lookups, extended cache TTL.
 */
export declare function resolveStaleUserId(req: AuthRequest): Promise<void>;
export declare function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void>;
