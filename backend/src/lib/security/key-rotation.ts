import crypto from "crypto";
import { Schema, model, Document } from "mongoose";
import { logger } from "../logger/index.js";

export interface ISigningKey extends Document {
  keyId: string;
  algorithm: string;
  publicKey: string;
  privateKey: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  version: number;
}

const signingKeySchema = new Schema<ISigningKey>({
  keyId: { type: String, required: true, unique: true },
  algorithm: { type: String, default: "RS256" },
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  version: { type: Number, required: true },
});

signingKeySchema.index({ isActive: 1, version: -1 });

export const SigningKey = model<ISigningKey>("SigningKey", signingKeySchema);

export class KeyRotationManager {
  private activeKeyCache: ISigningKey | null = null;
  private lastRotation: Date = new Date();

  constructor(
    private readonly rotationIntervalDays = 90,
    private readonly keySize = 4096,
  ) {}

  async generateKey(version: number): Promise<ISigningKey> {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: this.keySize,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    return SigningKey.create({
      keyId: crypto.randomUUID(),
      algorithm: "RS256",
      publicKey,
      privateKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.rotationIntervalDays * 24 * 60 * 60 * 1000),
      isActive: true,
      version,
    });
  }

  async getActiveKey(): Promise<any> {
    const needsRotation = this.activeKeyCache &&
      (Date.now() - this.lastRotation.getTime() > this.rotationIntervalDays * 24 * 60 * 60 * 1000);

    if (this.activeKeyCache && !needsRotation) return this.activeKeyCache;

    const key = await SigningKey.findOne({ isActive: true })
      .sort({ version: -1 })
      .lean() as any;

    if (key && !needsRotation) {
      this.activeKeyCache = key;
      return this.activeKeyCache;
    }

    const latestVersion = key?.version || 0;
    const newKey = await this.generateKey(latestVersion + 1);

    if (key) {
      await SigningKey.updateOne({ _id: key._id }, { isActive: false });
    }

    this.activeKeyCache = newKey;
    this.lastRotation = new Date();
    logger.info({ keyId: newKey.keyId, version: newKey.version }, "New signing key activated");
    return newKey;
  }

  async getPublicKey(keyId?: string): Promise<string | null> {
    const filter: Record<string, unknown> = { isActive: true };
    if (keyId) filter.keyId = keyId;

    const key = await SigningKey.findOne(filter)
      .sort({ version: -1 })
      .select("publicKey keyId version")
      .lean();

    return key?.publicKey || null;
  }

  async getAllPublicKeys(): Promise<Array<{ keyId: string; publicKey: string; algorithm: string }>> {
    const keys = await SigningKey.find({})
      .select("keyId publicKey algorithm")
      .lean();
    return keys.map(k => ({ keyId: k.keyId, publicKey: k.publicKey, algorithm: k.algorithm }));
  }

  async rotateKey(): Promise<boolean> {
    try {
      await this.getActiveKey();
      return true;
    } catch (err) {
      logger.error({ err }, "Key rotation failed");
      return false;
    }
  }

  async scheduleAutoRotation(): Promise<void> {
    const checkInterval = setInterval(async () => {
      try {
        await this.rotateKey();
      } catch {
        // Logged in rotateKey
      }
    }, this.rotationIntervalDays * 24 * 60 * 60 * 1000);

    if (checkInterval.unref) checkInterval.unref();
  }
}

export const keyRotation = new KeyRotationManager();
