import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// Boots a single in-memory MongoDB once for the whole run and stores the URI in
// an env var read by the per-suite connectTestDb(). Each suite cleans up its
// own collections between tests.
let mongod: MongoMemoryServer;

export default async function globalSetup(): Promise<void> {
  mongod = await MongoMemoryServer.create({ instance: { dbName: "jesttest" } });
  process.env.__TEST_MONGODB_URI__ = mongod.getUri();
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret";
  process.env.PERF_LOG = "0";
  process.env.AUTH_DEBUG = "0";
  process.env.ADMIN_EMAIL = "admin@example.com";
  // Skip rate limiter in tests by default; individual tests re-enable via import.
}

export async function _teardown(): Promise<void> {
  await mongod?.stop();
}

// Jest globalTeardown must be a separate file; this export is re-exported there.
(globalThis as any).__TEST_MONGODB_TEARDOWN__ = _teardown;
