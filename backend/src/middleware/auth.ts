import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jwtDecrypt, base64url, calculateJwkThumbprint } from "jose";
import { hkdf } from "@panva/hkdf";
import { env } from "../config/env.js";
import { JwtPayload } from "../types/index.js";
import type { AuthRequest } from "../types/index.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
export type { AuthRequest };

// Per-request auth logging is gated behind AUTH_DEBUG=1. The JWE/cookie path
// does crypto + string parsing on every request; logging each step to stdout
// synchronously is a real cost under load, so it is off in production.
const dbg = (...a: unknown[]) => {
  if (env.AUTH_DEBUG === "1") console.log(...a);
};
const dbgError = (...a: unknown[]) => {
  if (env.AUTH_DEBUG === "1") console.error(...a);
};

const JWE_ALG = "dir" as const;
const JWE_ENC = "A256CBC-HS512" as const;

// --- In-memory caches for auth hot path (bounded at 1000 entries) ---
const JWE_CACHE_TTL = 60_000;
const USER_CACHE_TTL = 300_000;
const CACHE_MAX = 1000;

const jweCache = new Map<string, { payload: JwtPayload; exp: number }>();
const resolveUserIdCache = new Map<string, { found: boolean; exp: number }>();

function cacheEvictIfNeeded<K>(cache: Map<K, unknown>): void {
  if (cache.size >= CACHE_MAX) {
    const iter = cache.keys();
    const toDelete = cache.size >> 1;
    for (let i = 0; i < toDelete; i++) {
      cache.delete(iter.next().value as K);
    }
  }
}

function jweCacheGet(key: string): JwtPayload | null {
  const hit = jweCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) { jweCache.delete(key); return null; }
  return hit.payload;
}

function jweCacheSet(key: string, payload: JwtPayload): void {
  cacheEvictIfNeeded(jweCache);
  jweCache.set(key, { payload, exp: Date.now() + JWE_CACHE_TTL });
}

function resolveCacheGet(userId: string): boolean | null {
  const hit = resolveUserIdCache.get(userId);
  if (!hit) return null;
  if (Date.now() > hit.exp) { resolveUserIdCache.delete(userId); return null; }
  return hit.found;
}

function resolveCacheSet(userId: string, found: boolean): void {
  cacheEvictIfNeeded(resolveUserIdCache);
  resolveUserIdCache.set(userId, { found, exp: Date.now() + USER_CACHE_TTL });
}
// --- End caches ---

async function getDerivedEncryptionKey(secret: string, salt: string): Promise<Uint8Array> {
  return await hkdf("sha256", secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64);
}

async function decryptSessionToken(token: string, salt: string, source: string): Promise<JwtPayload | null> {
  const cacheKey = `jwe:${token.slice(0, 64)}`;
  const cached = jweCacheGet(cacheKey);
  if (cached) {
    dbg(`[BACKEND AUTH] JWE cache hit (${source})`);
    return cached;
  }

  try {
    const encryptionSecret = await getDerivedEncryptionKey(env.JWT_SECRET, salt);
    dbg(`[BACKEND AUTH] Derived encryption key (${source}), length: ${encryptionSecret.length}`);
    const { payload } = await jwtDecrypt(token, async ({ kid, enc }) => {
      dbg(`[BACKEND AUTH] JWE header (${source}): kid=${kid}, enc=${enc}`);
      if (enc !== JWE_ENC) throw new Error("unsupported encryption");
      if (kid === undefined) return encryptionSecret;
      const thumbprint = await calculateJwkThumbprint(
        { kty: "oct", k: base64url.encode(encryptionSecret) },
        (`sha${encryptionSecret.byteLength << 3}`) as "sha256" | "sha384" | "sha512",
      );
      dbg(`[BACKEND AUTH] Calculated thumbprint: ${thumbprint}, kid: ${kid}`);
      if (kid === thumbprint) return encryptionSecret;
      throw new Error("no matching decryption secret");
    }, {
      clockTolerance: 15,
      keyManagementAlgorithms: [JWE_ALG],
      contentEncryptionAlgorithms: [JWE_ENC, "A256GCM"],
    });
    const result = {
      userId: (payload.sub || payload.id || payload.userId) as string,
      email: (payload.email || "") as string,
      role: (payload.role || "member") as string,
      permissions: (payload.permissions || []) as string[],
      orgId: (payload.orgId || undefined) as string | undefined,
    };
    dbg(`[BACKEND AUTH] Decrypted payload (${source}):`, JSON.stringify(result));
    jweCacheSet(cacheKey, result);
    return result;
  } catch (err) {
    dbgError(`[BACKEND AUTH] Decryption failed (${source}):`, err);
    return null;
  }
}

async function tryNextAuthCookie(req: AuthRequest): Promise<JwtPayload | null> {
  // First, check x-session-token header set by Next.js API route proxy
  const headerToken = req.headers["x-session-token"] as string | undefined;
  if (headerToken) {
    dbg(`[BACKEND AUTH] Found x-session-token header, length: ${headerToken.length}`);
    const result = await decryptSessionToken(headerToken, "authjs.session-token", "header");
    if (result) return result;
    dbg(`[BACKEND AUTH] Header token decryption failed, falling back to cookie`);
  }

  const cookieHeader = req.headers.cookie;
  dbg(`[BACKEND AUTH] Cookie header present: ${!!cookieHeader}`);
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map(c => c.trim());
  dbg(`[BACKEND AUTH] Cookies found: ${cookies.map(c => c.split("=")[0]).join(", ")}`);

  const chunksByPrefix: Record<string, Array<{ suffix: number; value: string }>> = {};

  for (const cookie of cookies) {
    const eqIdx = cookie.indexOf("=");
    const name = eqIdx === -1 ? cookie : cookie.slice(0, eqIdx);
    const value = eqIdx === -1 ? "" : cookie.slice(eqIdx + 1);
    dbg(`[BACKEND AUTH] Checking cookie: ${name}`);

    const simpleMatch = name === "authjs.session-token" || name === "__Secure-authjs.session-token";
    const chunkedMatch = name.startsWith("authjs.session-token.") || name.startsWith("__Secure-authjs.session-token.");

    if (simpleMatch || chunkedMatch) {
      const prefix = name.startsWith("__Secure-") ? "__Secure-authjs.session-token" : "authjs.session-token";
      const suffix = simpleMatch ? 0 : parseInt(name.slice(prefix.length + 1), 10);
      if (Number.isNaN(suffix)) continue;
      if (!chunksByPrefix[prefix]) chunksByPrefix[prefix] = [];
      chunksByPrefix[prefix].push({ suffix, value });
    }
  }

  for (const [prefix, chunks] of Object.entries(chunksByPrefix)) {
    chunks.sort((a, b) => a.suffix - b.suffix);
    const token = chunks.map(c => c.value).join("");
    dbg(`[BACKEND AUTH] Found NextAuth session token (${chunks.length} chunk(s)), total length: ${token.length}`);

    const result = await decryptSessionToken(token, prefix, `cookie:${prefix}`);
    if (result) return result;
  }

  dbg(`[BACKEND AUTH] No valid NextAuth session token cookie found`);
  return null;
}

/**
 * Middleware that only validates NextAuth session cookie (no Bearer token).
 * Used by AI routes which are only accessible through workspace/staff pages.
 */
export async function requireNextAuthSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const user = await tryNextAuthCookie(req);
  if (!user) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }
  req.user = user;
  await resolveStaleUserId(req);
  next();
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  dbg(`[BACKEND AUTH] ========== AUTHENTICATE START ==========`);
  dbg(`[BACKEND AUTH] authenticate called for: ${req.method} ${req.url}`);
  dbg(`[BACKEND AUTH] Request headers: cookie=${!!req.headers.cookie}, authorization=${!!req.headers.authorization}`);
  dbg(`[BACKEND AUTH] Request origin: ${req.headers.origin || 'not set'}`);
  dbg(`[BACKEND AUTH] Request referer: ${req.headers.referer || 'not set'}`);

  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice(7);
    dbg(`[BACKEND AUTH] Bearer token found, length: ${token.length}`);
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
      dbg(`[BACKEND AUTH] Bearer token verified:`, JSON.stringify(decoded));
      dbg(`[BACKEND AUTH] User ID from token: ${decoded.userId}`);
      dbg(`[BACKEND AUTH] Org ID from token: ${decoded.orgId}`);
      req.user = decoded;
      await resolveStaleUserId(req);
      dbg(`[BACKEND AUTH] ========== AUTHENTICATE SUCCESS (Bearer) ==========`);
      next();
      return;
    } catch (err) {
      dbgError(`[BACKEND AUTH] Bearer token verification failed:`, err);
      res.status(401).json({ success: false, error: "Invalid or expired token" });
      return;
    }
  }

  dbg(`[BACKEND AUTH] No Bearer token, trying NextAuth cookie...`);
  const nextAuthUser = await tryNextAuthCookie(req);
  if (nextAuthUser) {
    dbg(`[BACKEND AUTH] NextAuth cookie auth successful`);
    dbg(`[BACKEND AUTH] User ID from cookie: ${nextAuthUser.userId}`);
    dbg(`[BACKEND AUTH] Email from cookie: ${nextAuthUser.email}`);
    dbg(`[BACKEND AUTH] Role from cookie: ${nextAuthUser.role}`);
    dbg(`[BACKEND AUTH] Org ID from cookie: ${nextAuthUser.orgId}`);
    req.user = nextAuthUser;
    await resolveStaleUserId(req);
    dbg(`[BACKEND AUTH] ========== AUTHENTICATE SUCCESS (Cookie) ==========`);
    next();
    return;
  }

  dbg(`[BACKEND AUTH] Authentication failed - no valid credentials`);
  dbg(`[BACKEND AUTH] ========== AUTHENTICATE FAILED ==========`);
  // Surface auth failures even when debug is off — useful for clients.
  console.log(`[BACKEND AUTH] ${req.method} ${req.url} — no credentials`);
  res.status(401).json({ success: false, error: "Authentication required" });
}

/**
 * Resolve a stale userId from the JWT by looking up the user by email.
 * Called after authenticate to update req.user.userId if needed.
 * Optimized: parallelized lookups, extended cache TTL.
 */
export async function resolveStaleUserId(req: AuthRequest): Promise<void> {
  if (!req.user) return;
  const { userId, orgId } = req.user;

  if (orgId) {
    resolveCacheSet(userId, true);
    return;
  }

  const cached = resolveCacheGet(userId);
  if (cached === true) return;

  const member = await OrgMember.findOne({ userId }).lean().select("orgId").exec();
  if (member) {
    req.user.orgId = member.orgId;
    resolveCacheSet(userId, true);
    return;
  }

  resolveCacheSet(userId, false);
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
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
  } else {
    const nextAuthUser = await tryNextAuthCookie(req);
    if (nextAuthUser) {
      req.user = nextAuthUser;
    }
  }

  next();
}
