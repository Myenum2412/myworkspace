import crypto from "crypto";
import { env } from "../../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveEncryptionKey(): Buffer {
  const secret = env.JWT_SECRET;
  const hkdfInput = "myworkspace-totp-encryption-v1";
  return Buffer.from(crypto.hkdfSync("sha256", Buffer.from(secret), Buffer.alloc(16, 0), Buffer.from(hkdfInput), KEY_LENGTH));
}

export function encryptTOTPSecret(plaintext: string): string {
  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decryptTOTPSecret(ciphertext: string): string {
  const key = deriveEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted TOTP secret format");
  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
