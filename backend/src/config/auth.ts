import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "./env.js";
import { JwtPayload } from "../types/index.js";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: env.JWT_ISSUER,
    } as jwt.SignOptions,
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: env.JWT_ISSUER,
  }) as JwtPayload;
}

export function signRefreshToken(payload: { userId: string; orgId: string; tokenVersion: number; family: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: env.JWT_ISSUER,
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): { userId: string; orgId: string; tokenVersion: number; family: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: env.JWT_ISSUER,
  }) as { userId: string; orgId: string; tokenVersion: number; family: string };
}

export function signDeviceToken(payload: { userId: string; fingerprint: string; orgId: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "1y",
    issuer: env.JWT_ISSUER,
  } as jwt.SignOptions);
}
