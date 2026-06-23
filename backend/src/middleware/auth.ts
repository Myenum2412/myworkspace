import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jwtDecrypt, base64url, calculateJwkThumbprint } from "jose";
import { hkdf } from "@panva/hkdf";
import { env } from "../config/env.js";
import { JwtPayload } from "../types/index.js";
import type { AuthRequest } from "../types/index.js";
export type { AuthRequest };

const JWE_ALG = "dir" as const;
const JWE_ENC = "A256CBC-HS512" as const;

async function getDerivedEncryptionKey(secret: string, salt: string): Promise<Uint8Array> {
  return await hkdf("sha256", secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64);
}

async function tryNextAuthCookie(req: AuthRequest): Promise<JwtPayload | null> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map(c => c.trim());
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split("=");
    if (name === "authjs.session-token" || name === "__Secure-authjs.session-token") {
      const token = rest.join("=");
      try {
        const salt = name;
        const encryptionSecret = await getDerivedEncryptionKey(env.JWT_SECRET, salt);
        const { payload } = await jwtDecrypt(token, async ({ kid, enc }) => {
          if (enc !== JWE_ENC) throw new Error("unsupported encryption");
          if (kid === undefined) return encryptionSecret;
          const thumbprint = await calculateJwkThumbprint(
            { kty: "oct", k: base64url.encode(encryptionSecret) },
            (`sha${encryptionSecret.byteLength << 3}`) as "sha256" | "sha384" | "sha512",
          );
          if (kid === thumbprint) return encryptionSecret;
          throw new Error("no matching decryption secret");
        }, {
          clockTolerance: 15,
          keyManagementAlgorithms: [JWE_ALG],
          contentEncryptionAlgorithms: [JWE_ENC, "A256GCM"],
        });
        return {
          userId: (payload.sub || payload.id || payload.userId) as string,
          email: (payload.email || "") as string,
          role: (payload.role || "member") as string,
          permissions: (payload.permissions || []) as string[],
          orgId: (payload.orgId || undefined) as string | undefined,
        };
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

  const nextAuthUser = await tryNextAuthCookie(req);
  if (nextAuthUser) {
    req.user = nextAuthUser;
    next();
    return;
  }

  res.status(401).json({ success: false, error: "Authentication required" });
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
