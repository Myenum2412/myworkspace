import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

let mongoServer: MongoMemoryServer;

export const DEFAULT_USER_ID = "000000000000000000000001";

export async function startDb() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}

export async function stopDb() {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}

export function generateToken(overrides: Partial<{ userId: string; email: string; role: string }> = {}) {
  const payload = {
    userId: DEFAULT_USER_ID,
    email: "test@test.com",
    role: "admin",
    ...overrides,
  };
  return jwt.sign(payload, "myworkspace-dev-secret-change-in-production");
}

export function authHeader(overrides?: Partial<{ userId: string; email: string; role: string }>) {
  return { Authorization: `Bearer ${generateToken(overrides)}` };
}
