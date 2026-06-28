import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jwtDecrypt, base64url, calculateJwkThumbprint } from "jose";
import { hkdf } from "@panva/hkdf";
import { env } from "../config/env.js";
import { JwtPayload } from "../types/index.js";
import type { AuthRequest } from "../types/index.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { User } from "../lib/db/models/User.js";
export type { AuthRequest };

const JWE_ALG = "dir" as const;
const JWE_ENC = "A256CBC-HS512" as const;

async function getDerivedEncryptionKey(secret: string, salt: string): Promise<Uint8Array> {
  return await hkdf("sha256", secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64);
}

async function tryNextAuthCookie(req: AuthRequest): Promise<JwtPayload | null> {
  const cookieHeader = req.headers.cookie;
  console.log(`[BACKEND AUTH] Cookie header present: ${!!cookieHeader}`);
  if (!cookieHeader) {
    console.log(`[BACKEND AUTH] No cookie header`);
    return null;
  }

  const cookies = cookieHeader.split(";").map(c => c.trim());
  console.log(`[BACKEND AUTH] Cookies found: ${cookies.map(c => c.split("=")[0]).join(", ")}`);
  
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split("=");
    console.log(`[BACKEND AUTH] Checking cookie: ${name}`);
    if (name === "authjs.session-token" || name === "__Secure-authjs.session-token") {
      const token = rest.join("=");
      console.log(`[BACKEND AUTH] Found NextAuth session token, length: ${token.length}`);
      try {
        const salt = name;
        const encryptionSecret = await getDerivedEncryptionKey(env.JWT_SECRET, salt);
        console.log(`[BACKEND AUTH] Derived encryption key, length: ${encryptionSecret.length}`);
        const { payload } = await jwtDecrypt(token, async ({ kid, enc }) => {
          console.log(`[BACKEND AUTH] JWE header: kid=${kid}, enc=${enc}`);
          if (enc !== JWE_ENC) throw new Error("unsupported encryption");
          if (kid === undefined) return encryptionSecret;
          const thumbprint = await calculateJwkThumbprint(
            { kty: "oct", k: base64url.encode(encryptionSecret) },
            (`sha${encryptionSecret.byteLength << 3}`) as "sha256" | "sha384" | "sha512",
          );
          console.log(`[BACKEND AUTH] Calculated thumbprint: ${thumbprint}, kid: ${kid}`);
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
        console.log(`[BACKEND AUTH] Decrypted payload:`, JSON.stringify(result));
        return result;
      } catch (err) {
        console.error(`[BACKEND AUTH] Decryption failed:`, err);
        return null;
      }
    }
  }
  console.log(`[BACKEND AUTH] No NextAuth session token cookie found`);
  return null;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  console.log(`[BACKEND AUTH] ========== AUTHENTICATE START ==========`);
  console.log(`[BACKEND AUTH] authenticate called for: ${req.method} ${req.url}`);
  console.log(`[BACKEND AUTH] Request headers: cookie=${!!req.headers.cookie}, authorization=${!!req.headers.authorization}`);
  console.log(`[BACKEND AUTH] Request origin: ${req.headers.origin || 'not set'}`);
  console.log(`[BACKEND AUTH] Request referer: ${req.headers.referer || 'not set'}`);
  
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice(7);
    console.log(`[BACKEND AUTH] Bearer token found, length: ${token.length}`);
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      console.log(`[BACKEND AUTH] Bearer token verified:`, JSON.stringify(decoded));
      console.log(`[BACKEND AUTH] User ID from token: ${decoded.userId}`);
      console.log(`[BACKEND AUTH] Org ID from token: ${decoded.orgId}`);
      req.user = decoded;
      await resolveStaleUserId(req);
      console.log(`[BACKEND AUTH] ========== AUTHENTICATE SUCCESS (Bearer) ==========`);
      next();
      return;
    } catch (err) {
      console.error(`[BACKEND AUTH] Bearer token verification failed:`, err);
      res.status(401).json({ success: false, error: "Invalid or expired token" });
      return;
    }
  }

  console.log(`[BACKEND AUTH] No Bearer token, trying NextAuth cookie...`);
  const nextAuthUser = await tryNextAuthCookie(req);
  if (nextAuthUser) {
    console.log(`[BACKEND AUTH] NextAuth cookie auth successful`);
    console.log(`[BACKEND AUTH] User ID from cookie: ${nextAuthUser.userId}`);
    console.log(`[BACKEND AUTH] Email from cookie: ${nextAuthUser.email}`);
    console.log(`[BACKEND AUTH] Role from cookie: ${nextAuthUser.role}`);
    console.log(`[BACKEND AUTH] Org ID from cookie: ${nextAuthUser.orgId}`);
    req.user = nextAuthUser;
    await resolveStaleUserId(req);
    console.log(`[BACKEND AUTH] ========== AUTHENTICATE SUCCESS (Cookie) ==========`);
    next();
    return;
  }

  console.log(`[BACKEND AUTH] Authentication failed - no valid credentials`);
  console.log(`[BACKEND AUTH] ========== AUTHENTICATE FAILED ==========`);
  res.status(401).json({ success: false, error: "Authentication required" });
}

/**
 * Resolve a stale userId from the JWT by looking up the user by email.
 * Called after authenticate to update req.user.userId if needed.
 */
export async function resolveStaleUserId(req: AuthRequest): Promise<void> {
  if (!req.user) return;
  const { userId, email } = req.user;

  // Fast path: userId has a valid membership
  const member = await OrgMember.findOne({ userId }).lean();
  if (member) return;

  let resolvedId: string | null = null;

  // Try looking up user by userId first (in case userId matches a User doc but not OrgMember)
  if (userId) {
    const userById = await User.findById(userId).lean().catch(() => null)
      || await User.findOne({ id: userId }).lean().catch(() => null);
    if (userById) {
      resolvedId = userById.id || (userById as any)._id?.toString();
    }
  }

  // Fallback: lookup by email
  if (!resolvedId && email) {
    const userByEmail = await User.findOne({ email }).lean().catch(() => null);
    if (userByEmail) {
      resolvedId = userByEmail.id || (userByEmail as any)._id?.toString();
    }
  }

  if (resolvedId && resolvedId !== userId) {
    console.log(`[BACKEND AUTH] Resolved stale userId: ${userId} → ${resolvedId}`);
    req.user.userId = resolvedId;
  }
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
